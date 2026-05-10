import { appService } from '../appService.js';

const BATCH_INTERVAL_MS = 100;
const MAX_BATCH_SIZE = 50;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEALTH_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const PERIODIC_REFRESH_MS = 60 * 60 * 1000;
const IDLE_THRESHOLD_MS = 10 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

class SupabaseRealtimeService {
  constructor() {
    this._activeChannels = new Map();
    this._configs = new Map();
    this._eventQueue = [];
    this._isProcessingBatch = false;
    this._isPaused = false;
    this._isIdle = false;
    this._reconnectAttempts = 0;
    this._lastEventTime = null;
    this._lastActivityTime = Date.now();

    this._batchTimer = null;
    this._healthCheckTimer = null;
    this._periodicRefreshTimer = null;
    this._idleTimer = null;
    this._reconnectTimers = new Map();

    this.onConnectionLost = null;
    this.onConnectionRestored = null;
    this.onDebugLog = null;

    this._init();
  }

  get _supabase() { return appService.supabaseClient; }

  _init() {
    this._startBatchProcessor();
    this._startHealthCheck();
    this._startPeriodicRefresh();
    this._startIdleDetection();
    this._log('Service initialized');
  }

  _channelId(config) {
    return `${config.schema ?? 'public'}:${config.table}:${config.filterColumn ?? ''}:${config.filterValue ?? ''}`;
  }

  async subscribe(config) {
    const channelId = this._channelId(config);
    this._configs.set(channelId, config);

    if (this._isPaused || this._isIdle) {
      this._log('Subscription queued (paused/idle): ' + channelId);
      return channelId;
    }

    await this._createChannel(channelId, config);
    return channelId;
  }

  async _createChannel(channelId, config) {
    try {
      await this._removeChannel(channelId, true);

      const channel = this._supabase.channel('realtime:' + channelId);

      let pgConfig = {
        schema: config.schema ?? 'public',
        table: config.table,
        event: '*',
      };

      if (config.filterColumn && config.filterValue) {
        pgConfig.filter = `${config.filterColumn}=eq.${config.filterValue}`;
      }

      channel.on('postgres_changes', pgConfig, (payload) => {
        this._handlePayload(payload, config);
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this._log('Subscribed: ' + channelId);
          this._reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this._log('Subscribe error: ' + channelId + ' - ' + status);
          config.onError?.(new Error(status));
          this._scheduleReconnect(channelId);
        }
      });

      this._activeChannels.set(channelId, channel);
    } catch (e) {
      this._log('Error creating channel ' + channelId + ': ' + e);
      config.onError?.(e);
      this._scheduleReconnect(channelId);
    }
  }

  _handlePayload(payload, config) {
    this._lastEventTime = Date.now();
    this._lastActivityTime = Date.now();

    if (this._isIdle) {
      this._isIdle = false;
      this._log('Activity detected, exiting idle mode');
    }

    const newRecord = { ...(payload.new ?? {}) };
    const oldRecord = { ...(payload.old ?? {}) };
    delete newRecord.name_embedding;
    delete oldRecord.name_embedding;

    this._eventQueue.push({ eventType: payload.eventType, newRecord, oldRecord, config });

    if (this._eventQueue.length >= MAX_BATCH_SIZE) {
      this._processBatch();
    }
  }

  _startBatchProcessor() {
    clearInterval(this._batchTimer);
    this._batchTimer = setInterval(() => {
      if (this._eventQueue.length && !this._isProcessingBatch) {
        this._processBatch();
      }
    }, BATCH_INTERVAL_MS);
  }

  async _processBatch() {
    if (this._isProcessingBatch || !this._eventQueue.length) return;
    this._isProcessingBatch = true;
    try {
      const eventsToProcess = this._eventQueue.splice(0, MAX_BATCH_SIZE);
      const grouped = new Map();
      for (const ev of eventsToProcess) {
        const key = ev.config.table;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(ev);
      }
      for (const events of grouped.values()) {
        await this._processEventGroup(events);
      }
    } catch (e) {
      this._log('Batch processing error: ' + e);
    } finally {
      this._isProcessingBatch = false;
    }
  }

  async _processEventGroup(events) {
    for (const event of events) {
      try {
        if (event.eventType === 'INSERT') {
          await event.config.onInsert?.(event.newRecord);
        } else if (event.eventType === 'UPDATE') {
          await event.config.onUpdate?.(event.oldRecord, event.newRecord);
        } else if (event.eventType === 'DELETE') {
          await event.config.onDelete?.(event.oldRecord);
        }
      } catch (e) {
        this._log('Event processing error: ' + e);
        event.config.onError?.(e);
      }
    }
  }

  _scheduleReconnect(channelId) {
    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._log('Max reconnect attempts reached for ' + channelId);
      this.onConnectionLost?.();
      return;
    }

    clearTimeout(this._reconnectTimers.get(channelId));

    const baseDelay = Math.min(Math.pow(2, this._reconnectAttempts) * 1000, 64000);
    const jitter = baseDelay * 0.2 * Math.random();
    const delay = Math.round(baseDelay + jitter);

    this._reconnectAttempts++;
    this._log(`Reconnecting ${channelId} in ${Math.round(delay / 1000)}s (attempt ${this._reconnectAttempts})`);

    const timer = setTimeout(async () => {
      const config = this._configs.get(channelId);
      if (config && !this._isPaused && !this._isIdle) {
        await this._createChannel(channelId, config);
      }
    }, delay);

    this._reconnectTimers.set(channelId, timer);
  }

  _startHealthCheck() {
    clearInterval(this._healthCheckTimer);
    this._healthCheckTimer = setInterval(() => {
      if (this._isPaused || this._isIdle) return;
      if (this._activeChannels.size && this._lastEventTime) {
        const timeSinceLastEvent = Date.now() - this._lastEventTime;
        if (timeSinceLastEvent > 15 * 60 * 1000) {
          this._log('No events for 15m, refreshing connections');
          this._refreshAllSubscriptions();
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  _startPeriodicRefresh() {
    clearInterval(this._periodicRefreshTimer);
    this._periodicRefreshTimer = setInterval(() => {
      if (!this._isPaused && !this._isIdle) {
        this._log('Periodic refresh triggered');
        this._refreshAllSubscriptions();
      }
    }, PERIODIC_REFRESH_MS);
  }

  _startIdleDetection() {
    clearInterval(this._idleTimer);
    this._idleTimer = setInterval(() => {
      if (this._isPaused) return;
      const timeSinceActivity = Date.now() - this._lastActivityTime;
      if (!this._isIdle && timeSinceActivity > IDLE_THRESHOLD_MS) {
        this._log('Entering idle mode');
        this._isIdle = true;
        this._pauseAllSubscriptions();
      }
    }, IDLE_CHECK_INTERVAL_MS);
  }

  triggerActivity() {
    this._lastActivityTime = Date.now();
    if (this._isIdle && !this._isPaused) {
      this._log('Activity triggered, exiting idle');
      this._isIdle = false;
      this._resumeAllSubscriptions();
    }
  }

  async _pauseAllSubscriptions() {
    this._log('Pausing ' + this._activeChannels.size + ' subscriptions');
    for (const channelId of [...this._activeChannels.keys()]) {
      await this._removeChannel(channelId, true);
    }
    this._eventQueue.length = 0;
  }

  async _resumeAllSubscriptions() {
    this._log('Resuming ' + this._configs.size + ' subscriptions');
    const entries = [...this._configs.entries()];
    for (let i = 0; i < entries.length; i++) {
      if (this._isPaused || this._isIdle) break;
      const [channelId, config] = entries[i];
      await this._createChannel(channelId, config);
      if (i < entries.length - 1) await new Promise(r => setTimeout(r, 200));
    }
    this.onConnectionRestored?.();
  }

  async _refreshAllSubscriptions() {
    await this._pauseAllSubscriptions();
    await new Promise(r => setTimeout(r, 500));
    await this._resumeAllSubscriptions();
  }

  async _removeChannel(channelId, keepConfig = false) {
    try {
      const channel = this._activeChannels.get(channelId);
      if (channel) {
        await this._supabase.removeChannel(channel);
        this._activeChannels.delete(channelId);
      }
      if (!keepConfig) this._configs.delete(channelId);
    } catch (e) {
      this._log('Error removing channel ' + channelId + ': ' + e);
    }
  }

  async unsubscribe(channelId) {
    await this._removeChannel(channelId);
    this._log('Unsubscribed: ' + channelId);
  }

  async unsubscribeAll() {
    this._log('Unsubscribing all ' + this._activeChannels.size + ' channels');
    for (const channelId of [...this._activeChannels.keys()]) {
      await this._removeChannel(channelId);
    }
    this._eventQueue.length = 0;
  }

  async forceReconnectAll() {
    this._reconnectAttempts = 0;
    await this._refreshAllSubscriptions();
  }

  pause() {
    if (this._isPaused) return;
    this._log('Pausing subscriptions...');
    this._isPaused = true;
    this._pauseAllSubscriptions();
  }

  resume() {
    if (!this._isPaused) return;
    this._log('Resuming subscriptions...');
    this._isPaused = false;
    this._isIdle = false;
    this._lastActivityTime = Date.now();
    this._resumeAllSubscriptions();
  }

  dispose() {
    this._log('Disposing service');
    clearInterval(this._batchTimer);
    clearInterval(this._healthCheckTimer);
    clearInterval(this._periodicRefreshTimer);
    clearInterval(this._idleTimer);
    for (const timer of this._reconnectTimers.values()) clearTimeout(timer);
    this.unsubscribeAll();
  }

  _log(message) {
    if (import.meta.env.DEV) console.log('[RealtimeService]', message);
    this.onDebugLog?.(message);
  }

  get isPaused() { return this._isPaused; }
  get isIdle() { return this._isIdle; }
  get activeChannelCount() { return this._activeChannels.size; }
  get pendingEventsCount() { return this._eventQueue.length; }
  get activeChannelIds() { return [...this._activeChannels.keys()]; }
}

export const supabaseRealtimeService = new SupabaseRealtimeService();

// supabase_realtime_service_v2.dart
// World-class optimized realtime streaming for 24/7 POS systems

import 'dart:async';
import 'dart:collection';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Configuration for subscription
class RealtimeSubscriptionConfig {
  final String table;
  final String schema;
  final String? filterColumn;
  final String? filterValue;
  final Future<void> Function(Map<String, dynamic>)? onInsert;
  final Future<void> Function(Map<String, dynamic>, Map<String, dynamic>)?
  onUpdate;
  final Future<void> Function(Map<String, dynamic>)? onDelete;
  final void Function(Object)? onError;

  const RealtimeSubscriptionConfig({
    required this.table,
    this.schema = 'public',
    this.filterColumn,
    this.filterValue,
    this.onInsert,
    this.onUpdate,
    this.onDelete,
    this.onError,
  });

  String get channelId =>
      '$schema:$table:${filterColumn ?? ''}:${filterValue ?? ''}';
}

/// Batched event for processing
class _BatchedEvent {
  final PostgresChangeEvent eventType;
  final Map<String, dynamic> newRecord;
  final Map<String, dynamic> oldRecord;
  final RealtimeSubscriptionConfig config;
  final DateTime timestamp;

  _BatchedEvent({
    required this.eventType,
    required this.newRecord,
    required this.oldRecord,
    required this.config,
  }) : timestamp = DateTime.now();
}

/// World-class Supabase Realtime Service
///
/// Features:
/// - App lifecycle aware (pause on minimize, resume on focus)
/// - Event batching to reduce DB writes
/// - Smart reconnection with exponential backoff + jitter
/// - Memory-efficient channel management
/// - Automatic periodic refresh for 24/7 operation
/// - Zero lag design
class SupabaseRealtimeServiceV2 with WidgetsBindingObserver {
  static SupabaseRealtimeServiceV2? _instance;
  static SupabaseRealtimeServiceV2 get instance {
    _instance ??= SupabaseRealtimeServiceV2._();
    return _instance!;
  }

  SupabaseRealtimeServiceV2._() {
    _init();
  }

  // Supabase client
  final _supabase = Supabase.instance.client;

  // Channel management
  final Map<String, RealtimeChannel> _activeChannels = {};
  final Map<String, RealtimeSubscriptionConfig> _configs = {};

  // Event batching
  final Queue<_BatchedEvent> _eventQueue = Queue();
  Timer? _batchProcessTimer;
  bool _isProcessingBatch = false;
  static const _batchInterval = Duration(milliseconds: 100);
  static const _maxBatchSize = 50;

  // App lifecycle state
  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  bool _isPaused = false;

  // Reconnection management
  int _reconnectAttempts = 0;
  static const _maxReconnectAttempts = 10;
  Timer? _reconnectTimer;

  // Health check
  Timer? _healthCheckTimer;
  static const _healthCheckInterval = Duration(minutes: 2);
  DateTime? _lastEventTime;

  // Periodic refresh for 24/7 operation
  Timer? _periodicRefreshTimer;
  static const _refreshInterval = Duration(hours: 1);

  // Activity tracking
  DateTime _lastActivityTime = DateTime.now();
  Timer? _idleTimer;
  static const _idleThreshold = Duration(minutes: 10);
  bool _isIdle = false;

  // Callbacks
  void Function()? onConnectionLost;
  void Function()? onConnectionRestored;
  void Function(String message)? onDebugLog;

  /// Initialize service
  void _init() {
    WidgetsBinding.instance.addObserver(this);
    _startBatchProcessor();
    _startHealthCheck();
    _startPeriodicRefresh();
    _startIdleDetection();
    _log('Service initialized');
  }

  /// Handle app lifecycle changes
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    _log('Lifecycle changed: $state');

    switch (state) {
      case AppLifecycleState.resumed:
        _onAppResumed();
        break;
      case AppLifecycleState.inactive:
        // Short transition, don't pause yet
        break;
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _onAppPaused();
        break;
      case AppLifecycleState.detached:
        _onAppDetached();
        break;
    }
  }

  /// App came to foreground
  void _onAppResumed() {
    if (!_isPaused) return;

    _log('Resuming subscriptions...');
    _isPaused = false;
    _isIdle = false;
    _lastActivityTime = DateTime.now();

    // Resume with staggered reconnection
    _resumeAllSubscriptions();
  }

  /// App went to background
  void _onAppPaused() {
    if (_isPaused) return;

    _log('Pausing subscriptions...');
    _isPaused = true;

    // Pause all channels to save resources
    _pauseAllSubscriptions();
  }

  /// App detached (closing)
  void _onAppDetached() {
    _log('App detaching, cleaning up...');
    dispose();
  }

  /// Subscribe to a table
  Future<String> subscribe(RealtimeSubscriptionConfig config) async {
    final channelId = config.channelId;

    // Store config for reconnection
    _configs[channelId] = config;

    // Don't create if paused, will be created on resume
    if (_isPaused || _isIdle) {
      _log('Subscription queued (paused/idle): $channelId');
      return channelId;
    }

    await _createChannel(channelId, config);
    return channelId;
  }

  /// Create actual channel subscription
  Future<void> _createChannel(
    String channelId,
    RealtimeSubscriptionConfig config,
  ) async {
    try {
      // Remove existing if any
      await _removeChannel(channelId, keepConfig: true);

      final channel = _supabase.channel('realtime:$channelId');

      channel.onPostgresChanges(
        schema: config.schema,
        table: config.table,
        event: PostgresChangeEvent.all,
        filter: config.filterColumn != null && config.filterValue != null
            ? PostgresChangeFilter(
                type: PostgresChangeFilterType.eq,
                column: config.filterColumn!,
                value: config.filterValue!,
              )
            : null,
        callback: (payload, [ref]) => _handlePayload(payload, config),
      );

      final completer = Completer<void>();

      channel.subscribe((status, [error]) {
        if (status == RealtimeSubscribeStatus.subscribed) {
          _log('Subscribed: $channelId');
          _reconnectAttempts = 0;
          if (!completer.isCompleted) completer.complete();
        } else if (error != null) {
          _log('Subscribe error: $channelId - $error');
          config.onError?.call(error);
          if (!completer.isCompleted) completer.completeError(error);
          _scheduleReconnect(channelId);
        }
      });

      _activeChannels[channelId] = channel;

      // Wait for subscription with timeout
      await completer.future.timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          _log('Subscribe timeout: $channelId');
          _scheduleReconnect(channelId);
        },
      );
    } catch (e) {
      _log('Error creating channel $channelId: $e');
      config.onError?.call(e);
      _scheduleReconnect(channelId);
    }
  }

  /// Handle incoming payload - add to batch queue
  void _handlePayload(
    PostgresChangePayload payload,
    RealtimeSubscriptionConfig config,
  ) {
    _lastEventTime = DateTime.now();
    _lastActivityTime = DateTime.now();

    // Reset idle state on activity
    if (_isIdle) {
      _isIdle = false;
      _log('Activity detected, exiting idle mode');
    }

    // Clean data
    final newRecord = Map<String, dynamic>.from(payload.newRecord);
    final oldRecord = Map<String, dynamic>.from(payload.oldRecord);
    newRecord.remove('name_embedding');
    oldRecord.remove('name_embedding');

    // Add to batch queue
    _eventQueue.add(
      _BatchedEvent(
        eventType: payload.eventType,
        newRecord: newRecord,
        oldRecord: oldRecord,
        config: config,
      ),
    );

    // If queue is getting large, process immediately
    if (_eventQueue.length >= _maxBatchSize) {
      _processBatch();
    }
  }

  /// Start batch processor
  void _startBatchProcessor() {
    _batchProcessTimer?.cancel();
    _batchProcessTimer = Timer.periodic(_batchInterval, (_) {
      if (_eventQueue.isNotEmpty && !_isProcessingBatch) {
        _processBatch();
      }
    });
  }

  /// Process batched events
  Future<void> _processBatch() async {
    if (_isProcessingBatch || _eventQueue.isEmpty) return;

    _isProcessingBatch = true;

    try {
      // Take events to process
      final eventsToProcess = <_BatchedEvent>[];
      while (_eventQueue.isNotEmpty && eventsToProcess.length < _maxBatchSize) {
        eventsToProcess.add(_eventQueue.removeFirst());
      }

      // Group by table for efficient processing
      final groupedEvents = <String, List<_BatchedEvent>>{};
      for (final event in eventsToProcess) {
        final key = event.config.table;
        groupedEvents.putIfAbsent(key, () => []).add(event);
      }

      // Process each group
      for (final entry in groupedEvents.entries) {
        await _processEventGroup(entry.value);
      }
    } catch (e) {
      _log('Batch processing error: $e');
    } finally {
      _isProcessingBatch = false;
    }
  }

  /// Process a group of events for same table
  Future<void> _processEventGroup(List<_BatchedEvent> events) async {
    for (final event in events) {
      try {
        switch (event.eventType) {
          case PostgresChangeEvent.insert:
            await event.config.onInsert?.call(event.newRecord);
            break;
          case PostgresChangeEvent.update:
            await event.config.onUpdate?.call(event.oldRecord, event.newRecord);
            break;
          case PostgresChangeEvent.delete:
            await event.config.onDelete?.call(event.oldRecord);
            break;
          default:
            break;
        }
      } catch (e) {
        _log('Event processing error: $e');
        event.config.onError?.call(e);
      }
    }
  }

  /// Schedule reconnection with exponential backoff + jitter
  void _scheduleReconnect(String channelId) {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      _log('Max reconnect attempts reached for $channelId');
      onConnectionLost?.call();
      return;
    }

    _reconnectTimer?.cancel();

    // Exponential backoff with jitter
    final baseDelay = Duration(seconds: 1 << _reconnectAttempts.clamp(0, 6));
    final jitter = Duration(
      milliseconds:
          (baseDelay.inMilliseconds * 0.2 * (DateTime.now().millisecond / 1000))
              .round(),
    );
    final delay = baseDelay + jitter;

    _reconnectAttempts++;
    _log(
      'Reconnecting $channelId in ${delay.inSeconds}s (attempt $_reconnectAttempts)',
    );

    _reconnectTimer = Timer(delay, () async {
      final config = _configs[channelId];
      if (config != null && !_isPaused && !_isIdle) {
        await _createChannel(channelId, config);
      }
    });
  }

  /// Start health check timer
  void _startHealthCheck() {
    _healthCheckTimer?.cancel();
    _healthCheckTimer = Timer.periodic(_healthCheckInterval, (_) {
      _checkHealth();
    });
  }

  /// Check connection health
  void _checkHealth() {
    if (_isPaused || _isIdle) return;

    // Check if we have active channels but no recent events
    if (_activeChannels.isNotEmpty && _lastEventTime != null) {
      final timeSinceLastEvent = DateTime.now().difference(_lastEventTime!);

      // If no events for too long, channels might be stale
      if (timeSinceLastEvent > const Duration(minutes: 15)) {
        _log(
          'No events for ${timeSinceLastEvent.inMinutes}m, refreshing connections',
        );
        _refreshAllSubscriptions();
      }
    }
  }

  /// Start periodic refresh for 24/7 operation
  void _startPeriodicRefresh() {
    _periodicRefreshTimer?.cancel();
    _periodicRefreshTimer = Timer.periodic(_refreshInterval, (_) {
      if (!_isPaused && !_isIdle) {
        _log('Periodic refresh triggered');
        _refreshAllSubscriptions();
      }
    });
  }

  /// Start idle detection
  void _startIdleDetection() {
    _idleTimer?.cancel();
    _idleTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (_isPaused) return;

      final timeSinceActivity = DateTime.now().difference(_lastActivityTime);

      if (!_isIdle && timeSinceActivity > _idleThreshold) {
        _log('Entering idle mode');
        _isIdle = true;
        _pauseAllSubscriptions();
      }
    });
  }

  /// Trigger activity (call from UI interactions)
  void triggerActivity() {
    _lastActivityTime = DateTime.now();

    if (_isIdle && !_isPaused) {
      _log('Activity triggered, exiting idle');
      _isIdle = false;
      _resumeAllSubscriptions();
    }
  }

  /// Pause all subscriptions
  Future<void> _pauseAllSubscriptions() async {
    _log('Pausing ${_activeChannels.length} subscriptions');

    for (final channelId in _activeChannels.keys.toList()) {
      await _removeChannel(channelId, keepConfig: true);
    }

    // Clear any pending events to prevent memory buildup
    _eventQueue.clear();
  }

  /// Resume all subscriptions with staggering
  Future<void> _resumeAllSubscriptions() async {
    _log('Resuming ${_configs.length} subscriptions');

    final configs = _configs.entries.toList();

    for (var i = 0; i < configs.length; i++) {
      if (_isPaused || _isIdle) break;

      final entry = configs[i];
      await _createChannel(entry.key, entry.value);

      // Stagger subscriptions to avoid overwhelming
      if (i < configs.length - 1) {
        await Future.delayed(const Duration(milliseconds: 200));
      }
    }

    onConnectionRestored?.call();
  }

  /// Refresh all subscriptions (for periodic refresh)
  Future<void> _refreshAllSubscriptions() async {
    _log('Refreshing all subscriptions');

    await _pauseAllSubscriptions();
    await Future.delayed(const Duration(milliseconds: 500));
    await _resumeAllSubscriptions();
  }

  /// Remove a specific channel
  Future<void> _removeChannel(
    String channelId, {
    bool keepConfig = false,
  }) async {
    try {
      final channel = _activeChannels.remove(channelId);
      if (channel != null) {
        await channel.unsubscribe();
      }

      if (!keepConfig) {
        _configs.remove(channelId);
      }
    } catch (e) {
      _log('Error removing channel $channelId: $e');
    }
  }

  /// Unsubscribe from specific table
  Future<void> unsubscribe(String channelId) async {
    await _removeChannel(channelId);
    _log('Unsubscribed: $channelId');
  }

  /// Unsubscribe from all
  Future<void> unsubscribeAll() async {
    _log('Unsubscribing all ${_activeChannels.length} channels');

    for (final channelId in _activeChannels.keys.toList()) {
      await _removeChannel(channelId);
    }

    _eventQueue.clear();
  }

  /// Force reconnect all (call after network recovery)
  Future<void> forceReconnectAll() async {
    _reconnectAttempts = 0;
    await _refreshAllSubscriptions();
  }

  /// Dispose service
  void dispose() {
    _log('Disposing service');

    WidgetsBinding.instance.removeObserver(this);

    _batchProcessTimer?.cancel();
    _healthCheckTimer?.cancel();
    _periodicRefreshTimer?.cancel();
    _idleTimer?.cancel();
    _reconnectTimer?.cancel();

    unsubscribeAll();

    _instance = null;
  }

  /// Log helper
  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[RealtimeService] $message');
    }
    onDebugLog?.call(message);
  }

  // Getters
  bool get isPaused => _isPaused;
  bool get isIdle => _isIdle;
  int get activeChannelCount => _activeChannels.length;
  int get pendingEventsCount => _eventQueue.length;
  List<String> get activeChannelIds => _activeChannels.keys.toList();
  AppLifecycleState get lifecycleState => _lifecycleState;
}

import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';
import { authService } from '../authService.js';
import { BehaviorSubject } from '../behaviorSubject.js';

export const SyncStatus = Object.freeze({
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed',
  DEFECTIVE: 'defective',
});

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export class QueTableService {
  constructor(db) {
    this._db = db;
    this._isSyncing = new BehaviorSubject(false);
    this._syncStatus = new BehaviorSubject(SyncStatus.PENDING);
    this._autoSyncTimer = null;
    this._startAutoSync();
  }

  get isSyncing() { return this._isSyncing.value; }
  get syncStatus() { return this._syncStatus.value; }
  get _supabase() { return appService.supabaseClient; }

  _startAutoSync() {
    this._autoSyncTimer = setInterval(() => {
      if (!this._isSyncing.value) {
        this.syncQuesInitial({ isAutoSync: true }).catch(() => {});
      }
    }, AUTO_SYNC_INTERVAL_MS);
  }

  destroy() {
    clearInterval(this._autoSyncTimer);
    this._isSyncing.close();
    this._syncStatus.close();
  }

  async _checkInternetConnectivity() {
    return internetConnectivityService.isInternetConnected;
  }

  _shouldRetry(error) {
    const msg = String(error).toLowerCase();
    if (msg.includes('network') || msg.includes('connection') || msg.includes('auth') || msg.includes('permission')) return false;
    if (msg.includes('timeout')) return true;
    return true;
  }

  async create({ tableName, values, retryAttempt = 0 }) {
    if (!await this._checkInternetConnectivity()) throw new Error('No internet connection available');
    try {
      const payload = { ...values };
      delete payload.index;
      const { data, error } = await this._supabase.from(tableName).insert(payload).select();
      if (error) throw error;
      return data ?? [];
    } catch (e) {
      if (retryAttempt < MAX_RETRY_ATTEMPTS && this._shouldRetry(e)) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return this.create({ tableName, values, retryAttempt: retryAttempt + 1 });
      }
      throw e;
    }
  }

  async update({ tableName, columnName, columnValue, values, retryAttempt = 0 }) {
    if (!await this._checkInternetConnectivity()) throw new Error('No internet connection available');
    try {
      const { data, error } = await this._supabase
        .from(tableName)
        .update(values)
        .eq(columnName, columnValue)
        .select();
      if (error) throw error;
      return data ?? [];
    } catch (e) {
      if (retryAttempt < MAX_RETRY_ATTEMPTS && this._shouldRetry(e)) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return this.update({ tableName, columnName, columnValue, values, retryAttempt: retryAttempt + 1 });
      }
      throw e;
    }
  }

  async delete({ tableName, columnName, columnValue, retryAttempt = 0 }) {
    if (!await this._checkInternetConnectivity()) throw new Error('No internet connection available');
    try {
      const { error } = await this._supabase.from(tableName).delete().eq(columnName, columnValue);
      if (error) throw error;
      return true;
    } catch (e) {
      if (retryAttempt < MAX_RETRY_ATTEMPTS && this._shouldRetry(e)) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return this.delete({ tableName, columnName, columnValue, retryAttempt: retryAttempt + 1 });
      }
      throw e;
    }
  }

  async syncQuesInitial({ isAutoSync = false } = {}) {
    if (this._isSyncing.value) {
      return { success: false, error: 'Sync already in progress', status: SyncStatus.SYNCING };
    }

    this._isSyncing.add(true);
    this._syncStatus.add(SyncStatus.SYNCING);

    let processedCount = 0, failedCount = 0, defectiveCount = 0;

    try {
      const merchant = authService.merchant.value;
      const location = authService.selectedLocation.value;
      const terminal = authService.selectedTerminal.value;

      if (!merchant?.uuid || !location?.id || !terminal?.id) {
        throw new Error('Required data (merchant, location, or terminal) is missing');
      }

      const foundQues = await this._db.extQuery.getAllNonDefectiveQuesRecords();
      if (!foundQues.length) {
        this._syncStatus.add(SyncStatus.SUCCESS);
        return { success: true, status: SyncStatus.SUCCESS, processedCount: 0, failedCount: 0, defectiveCount: 0 };
      }

      if (!await this._checkInternetConnectivity()) throw new Error('No internet connection available');

      foundQues.sort((a, b) => {
        if (!a.created_at && !b.created_at) return 0;
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      // Process with concurrency limit of 3
      const CONCURRENCY = 3;
      for (let i = 0; i < foundQues.length; i += CONCURRENCY) {
        const batch = foundQues.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (record) => {
          try {
            await this._processRecord(record);
            processedCount++;
          } catch (e) {
            failedCount++;
            const msg = String(e);
            if (!msg.includes('internet') && !msg.includes('network')) {
              await this._db.extQuery.markRecordAsDefective(String(record.uuid), { errorMessage: msg });
              defectiveCount++;
            }
          }
        }));
      }

      this._syncStatus.add(SyncStatus.SUCCESS);
      return { success: true, status: SyncStatus.SUCCESS, processedCount, failedCount, defectiveCount };
    } catch (e) {
      this._syncStatus.add(SyncStatus.FAILED);
      return { success: false, error: e.toString(), status: SyncStatus.FAILED, processedCount, failedCount, defectiveCount };
    } finally {
      this._isSyncing.add(false);
    }
  }

  async _processRecord(record) {
    const operation = await this._fetchRelatedRecord(record.entity, record.entity_id);
    if (!operation) throw new Error(`Related record not found for entity: ${record.entity}, id: ${record.entity_id}`);

    const payload = { ...operation };
    delete payload.deleted_at;
    delete payload.id;
    delete payload.operation_at;

    switch (record.operation) {
      case 'create': {
        const res = await this.create({ tableName: record.entity, values: payload });
        if (res.length) {
          await this._updateDbLocal(record.entity, res);
          await this._db.extQuery.deleteRecord(String(record.uuid));
        }
        break;
      }
      case 'update': {
        const res = await this.update({ tableName: record.entity, columnName: 'uuid', columnValue: record.entity_id, values: payload });
        if (res.length) {
          await this._updateDbLocal(record.entity, res);
          await this._db.extQuery.deleteRecord(String(record.uuid));
        }
        break;
      }
      case 'delete': {
        await this.delete({ tableName: record.entity, columnName: 'uuid', columnValue: record.entity_id });
        await this._db.extQuery.deleteRecord(String(record.uuid));
        break;
      }
      default:
        throw new Error('Unknown operation: ' + record.operation);
    }
  }

  async _fetchRelatedRecord(entity, entityId) {
    try {
      const { data, error } = await this._supabase.from(entity).select().eq('uuid', entityId).single();
      if (error) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  async _updateDbLocal(entity, res) {
    if (!res.length) return;
    const row = res[0];
    const db = this._db;
    const entityMap = {
      'location_products': () => db.products.createOrUpdate(row),
      'customers': () => db.customers.createOrUpdateAll([row]),
      'location_categories': () => db.categories.createOrUpdateAll([row]),
      'ext_display_level_categories': () => db.displayLevelCategories.createOrUpdateAll([row]),
      'services': () => db.services.createOrUpdateAll([row]),
      'modifier_group': () => db.modifierGroups.createOrUpdateAll([row]),
      'location_modifiers': () => db.locationModifiers.createOrUpdateAll([row]),
      'ext_orders': () => db.extOrders.createOrUpdateAll([row]),
      'modifier_display_levels_location': () => db.modifierDisplayLevels.createOrUpdateAll([row]),
    };
    const fn = entityMap[entity];
    if (fn) await fn();
  }

  async resetDefectiveRecords() {
    return this._db.extQuery.resetDefectiveRecords();
  }
}

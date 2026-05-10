import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';

const DEFAULT_BATCH_SIZE = 1000;
const CONNECTIVITY_CACHE_MS = 5000;

export class GenericSupabaseService {
  constructor({ tableName, requiresLocationFilter, fromJson, repositorySaveAll }) {
    this._tableName = tableName;
    this._requiresLocationFilter = requiresLocationFilter;
    this._fromJson = fromJson;
    this._repositorySaveAll = repositorySaveAll;

    this._lastConnectivityCheck = null;
    this._lastConnectivityStatus = null;
  }

  get _supabase() {
    return appService.supabaseClient;
  }

  async _isInternetAvailable() {
    const now = Date.now();
    if (
      this._lastConnectivityCheck !== null &&
      this._lastConnectivityStatus !== null &&
      now - this._lastConnectivityCheck < CONNECTIVITY_CACHE_MS
    ) {
      return this._lastConnectivityStatus;
    }
    const isConnected = internetConnectivityService.isInternetConnected;
    this._lastConnectivityCheck = now;
    this._lastConnectivityStatus = isConnected;
    return isConnected;
  }

  async insertRecord(data) {
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      const { data: result, error } = await this._supabase
        .from(this._tableName)
        .insert(data)
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async updateRecord(uuid, updateData) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      const { data: result, error } = await this._supabase
        .from(this._tableName)
        .update(updateData)
        .eq('uuid', uuid)
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async upsertRecord(uuid, data) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      const { data: result, error } = await this._supabase
        .from(this._tableName)
        .upsert({ ...data, uuid })
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async deleteRecord(uuid) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      const { error } = await this._supabase
        .from(this._tableName)
        .delete()
        .eq('uuid', uuid);
      if (error) return { success: false, error: error.message };
      return { success: true, data: 'Record deleted successfully' };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async deleteRecordsWithConditions(conditions) {
    if (!conditions || !Object.keys(conditions).length) {
      return { success: false, error: 'Conditions cannot be empty' };
    }
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      let query = this._supabase.from(this._tableName).delete();
      for (const [key, val] of Object.entries(conditions)) {
        query = query.eq(key, val);
      }
      const { error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data: 'Records deleted successfully' };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async getRecordByUUID(uuid) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      const { data, error } = await this._supabase
        .from(this._tableName)
        .select()
        .eq('uuid', uuid)
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async getAllRecords({ limit = DEFAULT_BATCH_SIZE, offset = 0, locationId } = {}) {
    if (this._requiresLocationFilter && !locationId) {
      return { success: false, error: 'Location ID is required' };
    }
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection' };
    try {
      let query = this._supabase.from(this._tableName).select();
      if (this._requiresLocationFilter && locationId) {
        query = query.eq('location_id', String(locationId));
      }
      query = query.range(offset, offset + limit - 1);
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }

  async *syncRecordsInIsolate({ locationId } = {}) {
    const batchSize = DEFAULT_BATCH_SIZE;
    let offset = 0;
    let hasMore = true;
    let progress = 0;
    let totalCount = 0;
    const errors = [];

    if (!await this._isInternetAvailable()) {
      yield { progress: 0, total: 0, errors: ['No internet connection'] };
      return;
    }

    if (this._requiresLocationFilter && !locationId) {
      yield { progress: 0, total: 0, errors: ['No Location Found - Please Login Merchant Again'] };
      return;
    }

    const DATE_FIELDS = [
      'updated_at', 'created_at', 'operation_at', 'status_timestamp',
      'ticket_status_timestamp', 'deleted_at',
    ];

    while (hasMore) {
      const result = await this.getAllRecords({ limit: batchSize, offset, locationId });

      if (!result.success) {
        errors.push('Sync batch failed: ' + result.error);
        hasMore = false;
        break;
      }

      const records = result.data ?? [];
      hasMore = records.length === batchSize;

      if (records.length > 0) {
        const parsed = [];
        for (const json of records) {
          try {
            for (const field of DATE_FIELDS) {
              if (typeof json[field] === 'string') {
                try { json[field] = new Date(json[field]); } catch (_) { json[field] = null; }
              }
            }
            parsed.push(this._fromJson(json));
          } catch (e) {
            errors.push('Error parsing record: ' + e.toString());
          }
        }

        if (parsed.length) {
          try {
            await this._repositorySaveAll(parsed);
            progress += parsed.length;
          } catch (e) {
            errors.push('Error saving records locally: ' + e.toString());
          }
        }

        if (totalCount === 0 && !hasMore) totalCount = progress;
        else if (totalCount === 0) totalCount = progress + batchSize;

        yield { progress, total: totalCount, errors: [...errors] };
      }

      offset += batchSize;
    }

    yield { progress, total: totalCount > 0 ? totalCount : progress, errors };
  }
}

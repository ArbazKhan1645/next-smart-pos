import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';

const TABLE = 'units';
const BATCH_SIZE = 1000;
const CONNECTIVITY_CACHE_MS = 5000;

export class UnitsService {
  constructor() {
    this._lastConnectivityCheck = null;
    this._lastConnectivityStatus = null;
  }

  get _supabase() { return appService.supabaseClient; }

  async _isInternetAvailable() {
    const now = Date.now();
    if (this._lastConnectivityCheck !== null && now - this._lastConnectivityCheck < CONNECTIVITY_CACHE_MS) {
      return this._lastConnectivityStatus;
    }
    const isConnected = internetConnectivityService.isInternetConnected;
    this._lastConnectivityCheck = now;
    this._lastConnectivityStatus = isConnected;
    return isConnected;
  }

  async _executeQuery(queryFn) {
    if (!await this._isInternetAvailable()) return { success: false, error: 'No internet connection', data: [] };
    try {
      const data = await queryFn();
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message ?? e.toString() };
    }
  }

  async insertUnit(unitData) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).insert(unitData).select().single();
      if (error) throw error;
      return data;
    });
  }

  async updateUnit(uuid, updateData) {
    if (!uuid) return { success: false, error: 'Unit UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).update(updateData).eq('uuid', uuid).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteUnit(uuid) {
    if (!uuid) return { success: false, error: 'Unit UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { error } = await this._supabase.from(TABLE).delete().eq('uuid', uuid);
      if (error) throw error;
      return 'Unit deleted successfully';
    });
  }

  async getUnitByUUID(uuid) {
    if (!uuid) return { success: false, error: 'Unit UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('uuid', uuid).single();
      if (error) throw error;
      return data;
    });
  }

  async getAllUnits({ limit = BATCH_SIZE, offset = 0 } = {}) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase
        .from(TABLE)
        .select()
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data;
    });
  }

  async _getUnitsCount() {
    try {
      const { count, error } = await this._supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    } catch (e) {
      return 0;
    }
  }

  async *syncAllUnitsFromSupabase(db) {
    let offset = 0;
    let hasMore = true;
    let progress = 0;
    let totalCount = 0;
    const errors = [];

    try {
      totalCount = await this._getUnitsCount();
      if (totalCount === 0) { yield { progress: 0, total: 0, errors: [] }; return; }

      yield { progress, total: totalCount, errors };

      while (hasMore) {
        const result = await this.getAllUnits({ limit: BATCH_SIZE, offset });

        if (result.success && result.data) {
          const dataList = result.data;
          const unitsToSave = [];

          for (const json of dataList) {
            try {
              unitsToSave.push(json);
            } catch (e) {
              errors.push(`Error parsing unit: ${json.name ?? 'Unknown'}, reason: ${e}`);
            }
          }

          if (unitsToSave.length) {
            try {
              await db.units.createOrUpdateAll(unitsToSave);
              progress += unitsToSave.length;
            } catch (e) {
              errors.push('Error bulk saving units: ' + e.toString());
            }
          }

          yield { progress, total: totalCount, errors };
          hasMore = dataList.length === BATCH_SIZE;
          offset += BATCH_SIZE;
        } else {
          errors.push('API response failed: ' + (result.error ?? 'Unknown error'));
          hasMore = false;
        }
      }
    } catch (e) {
      errors.push('Unexpected error: ' + e.toString());
    } finally {
      yield { progress, total: totalCount > 0 ? totalCount : progress, errors };
    }
  }
}

export const unitsService = new UnitsService();

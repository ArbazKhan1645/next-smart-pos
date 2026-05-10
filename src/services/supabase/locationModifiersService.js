import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';
import { authService } from '../authService.js';

const TABLE = 'location_modifiers';
const BATCH_SIZE = 1000;
const CONNECTIVITY_CACHE_MS = 5000;

export class LocationModifiersService {
  constructor() {
    this._lastConnectivityCheck = null;
    this._lastConnectivityStatus = null;
  }

  get _supabase() { return appService.supabaseClient; }
  get _locationId() { return authService.selectedLocation.value?.id ?? null; }

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

  async insertLocationModifier(data) {
    return this._executeQuery(async () => {
      const { data: result, error } = await this._supabase.from(TABLE).insert(data).select().single();
      if (error) throw error;
      return result;
    });
  }

  async updateLocationModifier(uuid, updateData) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).update(updateData).eq('uuid', uuid).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteLocationModifier(uuid) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { error } = await this._supabase.from(TABLE).delete().eq('uuid', uuid);
      if (error) throw error;
      return 'Location Modifier deleted successfully';
    });
  }

  async getLocationModifierByUUID(uuid) {
    if (!uuid) return { success: false, error: 'UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('uuid', uuid).single();
      if (error) throw error;
      return data;
    });
  }

  async getAllLocationModifiers({ limit = BATCH_SIZE, offset = 0, locationId } = {}) {
    if (!locationId) return { success: false, error: 'Location ID is required' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase
        .from(TABLE)
        .select()
        .eq('location_id', String(locationId))
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data;
    });
  }

  async _getCount(locationId) {
    try {
      const { count, error } = await this._supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('location_id', String(locationId));
      if (error) return 0;
      return count ?? 0;
    } catch (e) { return 0; }
  }

  async *syncFromSupabase(db) {
    let offset = 0, hasMore = true, progress = 0, totalCount = 0;
    const errors = [];
    try {
      const locationId = this._locationId;
      if (!locationId) { yield { progress: 0, total: 0, errors: ['No Location Found'] }; return; }
      totalCount = await this._getCount(locationId);
      if (totalCount === 0) { yield { progress: 0, total: 0, errors: [] }; return; }
      yield { progress, total: totalCount, errors };
      while (hasMore) {
        const result = await this.getAllLocationModifiers({ limit: BATCH_SIZE, offset, locationId });
        if (result.success && result.data) {
          const items = result.data;
          if (items.length) {
            try { await db.locationModifiers.createOrUpdateAll(items); progress += items.length; }
            catch (e) { errors.push('Error bulk saving: ' + e.toString()); }
          }
          yield { progress, total: totalCount, errors };
          hasMore = items.length === BATCH_SIZE;
          offset += BATCH_SIZE;
        } else {
          errors.push('API failed: ' + (result.error ?? 'Unknown'));
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

export const locationModifiersService = new LocationModifiersService();

import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';
import { authService } from '../authService.js';

const TABLE = 'staffs';
const CONNECTIVITY_CACHE_MS = 5000;

export class StaffsService {
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

  async insertStaff(staffData) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).insert(staffData).select().single();
      if (error) throw error;
      return data;
    });
  }

  async updateStaff(uuid, updateData) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).update(updateData).eq('uuid', uuid).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteStaff(uuid) {
    return this._executeQuery(async () => {
      const { error } = await this._supabase.from(TABLE).delete().eq('uuid', uuid);
      if (error) throw error;
      return 'Staff deleted successfully';
    });
  }

  async getStaffByUUID(uuid) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('uuid', uuid).single();
      if (error) throw error;
      return data;
    });
  }

  async getAllStaffs() {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select();
      if (error) throw error;
      return data;
    });
  }

  async getStaffsByLocation(locationId) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('location_id', String(locationId));
      if (error) throw error;
      return data;
    });
  }

  async getStaffsCount(locationId) {
    if (!await this._isInternetAvailable()) return 0;
    try {
      const { count, error } = await this._supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('location_id', String(locationId));
      if (error) return -1;
      return count ?? 0;
    } catch (e) {
      return -1;
    }
  }

  async *syncAllStaffsFromSupabase(db) {
    const INITIAL_BATCH = 500;
    const MAX_BATCH = 1000;
    const MIN_BATCH = 50;
    const DB_CHUNK = 100;

    let batchSize = INITIAL_BATCH;
    let offset = 0;
    let processedCount = 0;
    let totalCount = 0;
    const errors = [];
    let isCancelled = false;

    const unsubConnectivity = internetConnectivityService.subscribe((connected) => {
      if (!connected) isCancelled = true;
    });

    let consecutiveSuccesses = 0;
    let consecutiveFailures = 0;

    try {
      const locationId = this._locationId;
      if (!locationId) {
        yield { progress: 0, total: 0, errors: ['No Location Found - Please Login Merchant Again'] };
        return;
      }

      if (!await this._isInternetAvailable()) {
        yield { progress: 0, total: 0, errors: ['No internet connection available.'] };
        return;
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        totalCount = await this.getStaffsCount(locationId);
        if (totalCount > 0) break;
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          if (!await this._isInternetAvailable()) {
            yield { progress: 0, total: 0, errors: ['Lost internet connection while getting staffs count'] };
            return;
          }
        }
      }

      if (totalCount <= 0) {
        yield { progress: 0, total: 0, errors: ['No staffs found for location'] };
        return;
      }

      yield { progress: 0, total: totalCount, errors: [] };

      while (offset < totalCount && !isCancelled) {
        if (!await this._isInternetAvailable()) {
          errors.push(`Internet connection lost at staff ${offset + 1}. Sync paused.`);
          yield { progress: processedCount, total: totalCount, errors };
          return;
        }

        try {
          const { data: rows, error } = await this._supabase
            .from(TABLE)
            .select()
            .eq('location_id', String(locationId))
            .range(offset, offset + batchSize - 1);

          if (error) throw error;
          if (!rows?.length) break;

          const staffsList = [];
          for (const json of rows) {
            try {
              delete json.name_embedding;
              staffsList.push({
                id: json.id ?? null,
                uuid: json.uuid ?? '',
                number: json.number ?? '',
                created_at: json.created_at ?? null,
                updated_at: json.updated_at ?? null,
                version: json.version ?? null,
                first_name: json.first_name ?? '',
                last_name: json.last_name ?? '',
                email: json.email ?? '',
                phone: json.phone ?? '',
                merchant_id: json.merchant_id ?? null,
                role_uuid: json.role_uuid ?? '',
                location_id: json.location_id ?? null,
                is_active: json.is_active === true,
                is_quick_login: json.is_quick_login === true,
                is_logout_after_sale: json.is_logout_after_sale === true,
                is_cash_drawer: json.is_cash_drawer === true,
                is_super_user: json.is_super_user === true,
                is_training_staff: json.is_training_staff === true || json.is_Training_staff === true,
                is_show_driver: json.is_show_driver === true,
                is_waiter: json.is_waiter === true,
                password: json.password ?? '',
                pin: json.pin ?? '',
                is_engineer: json.is_engineer === true,
              });
            } catch (e) {
              // skip parse errors
            }
          }

          for (let i = 0; i < staffsList.length; i += DB_CHUNK) {
            const chunk = staffsList.slice(i, i + DB_CHUNK);
            try {
              await db.staffs.createOrUpdateAll(chunk);
              processedCount += chunk.length;
              if (i + DB_CHUNK >= staffsList.length) {
                yield { progress: processedCount, total: totalCount, errors };
              }
            } catch (dbError) {
              errors.push(`Database Error at offset ${offset + i}: ${String(dbError).slice(0, 100)}`);
              yield { progress: processedCount, total: totalCount, errors };
            }
            await new Promise(r => setTimeout(r, 0));
          }

          consecutiveSuccesses++;
          consecutiveFailures = 0;
          if (consecutiveSuccesses >= 3 && batchSize < MAX_BATCH) {
            batchSize = Math.min(MAX_BATCH, batchSize * 2);
            consecutiveSuccesses = 0;
          }

          offset += batchSize;
          await new Promise(r => setTimeout(r, 100));
        } catch (apiError) {
          consecutiveFailures++;
          consecutiveSuccesses = 0;
          errors.push(`API Error (Offset ${offset}): ${String(apiError).slice(0, 100)}`);
          yield { progress: processedCount, total: totalCount, errors };

          if (consecutiveFailures >= 2 && batchSize > MIN_BATCH) {
            batchSize = Math.max(MIN_BATCH, Math.floor(batchSize / 2));
          }

          await new Promise(r => setTimeout(r, Math.min(5000, consecutiveFailures * 1000)));
          if (consecutiveFailures >= 5) { errors.push('Aborting sync after 5 consecutive failures'); break; }
        }
      }

      if (isCancelled) errors.push('Sync cancelled due to internet connection loss');
    } catch (e) {
      errors.push('Unexpected Error: ' + e.toString());
    } finally {
      unsubConnectivity();
      yield { progress: processedCount, total: totalCount, errors };
    }
  }
}

export const staffsService = new StaffsService();

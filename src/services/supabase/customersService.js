import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';
import { authService } from '../authService.js';

const TABLE = 'customers';
const BATCH_SIZE = 1000;
const CONNECTIVITY_CACHE_MS = 5000;

export class CustomersService {
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

  async insertCustomer(customerData) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).insert(customerData).select().single();
      if (error) throw error;
      return data;
    });
  }

  async updateCustomer(uuid, updateData) {
    if (!uuid) return { success: false, error: 'Customer UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).update(updateData).eq('uuid', uuid).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteCustomer(uuid) {
    if (!uuid) return { success: false, error: 'Customer UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { error } = await this._supabase.from(TABLE).delete().eq('uuid', uuid);
      if (error) throw error;
      return 'Customer deleted successfully';
    });
  }

  async getCustomerByUUID(uuid) {
    if (!uuid) return { success: false, error: 'Customer UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('uuid', uuid).single();
      if (error) throw error;
      return data;
    });
  }

  async getAllCustomers() {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select();
      if (error) throw error;
      return data;
    });
  }

  async getCustomersByLocation(locationId) {
    if (!locationId) return { success: false, error: 'Location ID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('location_id', String(locationId));
      if (error) throw error;
      return data;
    });
  }

  async getAllCustomersOfLocation({ limit = BATCH_SIZE, offset = 0, locationId } = {}) {
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

  async _getCustomersCount(locationId) {
    try {
      const { count, error } = await this._supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('location_id', String(locationId));
      if (error) return 0;
      return count ?? 0;
    } catch (e) {
      return 0;
    }
  }

  async *syncAllCustomersFromSupabase(db) {
    let offset = 0;
    let hasMore = true;
    let progress = 0;
    let totalCount = 0;
    const errors = [];

    try {
      const locationId = this._locationId;
      if (!locationId) {
        yield { progress: 0, total: 0, errors: ['No Location Found - Please Login Merchant Again'] };
        return;
      }

      totalCount = await this._getCustomersCount(locationId);
      if (totalCount === 0) { yield { progress: 0, total: 0, errors: [] }; return; }

      yield { progress, total: totalCount, errors };

      while (hasMore) {
        const result = await this.getAllCustomersOfLocation({ limit: BATCH_SIZE, offset, locationId });

        if (result.success && result.data) {
          const dataList = result.data;
          const customersToSave = [];

          for (const json of dataList) {
            try {
              customersToSave.push(json);
            } catch (e) {
              errors.push(`Error parsing customer: ${json.name ?? 'Unknown'}, reason: ${e}`);
            }
          }

          if (customersToSave.length) {
            try {
              await db.customers.createOrUpdateAll(customersToSave);
              progress += customersToSave.length;
            } catch (e) {
              errors.push('Error bulk saving customers: ' + e.toString());
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

export const customersService = new CustomersService();

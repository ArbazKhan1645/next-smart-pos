import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';
import { authService } from '../authService.js';

const TABLE = 'location_categories';
const BATCH_SIZE = 1000;
const CONNECTIVITY_CACHE_MS = 5000;

export class CategoriesService {
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

  async insertCategory(categoryData) {
    return this._executeQuery(async () => {
      const uuid = categoryData.uuid;
      if (uuid) {
        const { data: existing } = await this._supabase.from(TABLE).select().eq('uuid', uuid).maybeSingle();
        if (existing) return { message: 'Category already exists', category: existing, skipped: true };
      }
      const { data, error } = await this._supabase.from(TABLE).insert(categoryData).select().single();
      if (error) throw error;
      return { message: 'Category inserted', category: data, skipped: false };
    });
  }

  async updateCategory(uuid, updateData) {
    if (!uuid) return { success: false, error: 'Category UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).update(updateData).eq('uuid', uuid).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteCategory(uuid) {
    if (!uuid) return { success: false, error: 'Category UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { error } = await this._supabase.from(TABLE).delete().eq('uuid', uuid);
      if (error) throw error;
      return 'Category deleted successfully';
    });
  }

  async getCategoryByUUID(uuid) {
    if (!uuid) return { success: false, error: 'Category UUID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('uuid', uuid).single();
      if (error) throw error;
      return data;
    });
  }

  async getAllCategories() {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select();
      if (error) throw error;
      return data;
    });
  }

  async getCategoriesByLocation(locationId) {
    if (!locationId) return { success: false, error: 'Location ID cannot be empty' };
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('location_id', String(locationId));
      if (error) throw error;
      return data;
    });
  }

  async getAllCategoriesOfLocation({ limit = BATCH_SIZE, offset = 0, locationId } = {}) {
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

  async _getCategoryCount(locationId) {
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

  async *syncAllCategoriesFromSupabase(db) {
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

      totalCount = await this._getCategoryCount(locationId);
      if (totalCount === 0) { yield { progress: 0, total: 0, errors: [] }; return; }

      yield { progress, total: totalCount, errors };

      while (hasMore) {
        const result = await this.getAllCategoriesOfLocation({ limit: BATCH_SIZE, offset, locationId });

        if (result.success && result.data) {
          const dataList = result.data;
          const categoriesToSave = [];

          for (const json of dataList) {
            try {
              delete json.name_embedding;
              const category = {
                uuid: json.uuid ?? '',
                name: json.name ?? '',
                location_id: json.location_id ?? '',
                button_height: json.button_height ?? 130,
                button_width: json.button_width ?? 130,
                font_size: json.font_size ?? 16,
                id: json.id ?? 0,
                created_at: json.created_at ?? new Date().toISOString(),
                version: json.version ?? 0,
                text_color: json.text_color ?? '',
                background_color: json.background_color ?? '',
                index: json.index ?? 0,
                printers: json.printers ?? [],
                parent_uuid: json.parent_uuid ?? null,
              };
              categoriesToSave.push(category);
            } catch (e) {
              errors.push(`Error parsing category: ${json.name ?? 'Unknown'}, reason: ${e}`);
            }
          }

          if (categoriesToSave.length) {
            try {
              await db.categories.createOrUpdateAll(categoriesToSave);
              progress += categoriesToSave.length;
            } catch (e) {
              errors.push('Error bulk saving categories: ' + e.toString());
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

export const categoriesService = new CategoriesService();

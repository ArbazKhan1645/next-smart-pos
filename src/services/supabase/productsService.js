import { appService } from '../appService.js';
import { internetConnectivityService } from '../internetConnectivityService.js';
import { authService } from '../authService.js';

const TABLE = 'location_products';
const CONNECTIVITY_CACHE_MS = 5000;

export class ProductsService {
  constructor() {
    this._lastConnectivityCheck = null;
    this._lastConnectivityStatus = null;
  }

  get _supabase() { return appService.supabaseClient; }

  get _locationId() {
    return authService.selectedLocation.value?.id ?? null;
  }

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

  async insertProduct(productData) {
    return this._executeQuery(async () => {
      const uuid = productData.uuid;
      if (uuid) {
        const { data: existing } = await this._supabase.from(TABLE).select().eq('uuid', uuid).maybeSingle();
        if (existing) return { message: 'Product already exists', product: existing, skipped: true };
      }
      const { data, error } = await this._supabase.from(TABLE).insert(productData).select().single();
      if (error) throw error;
      return { message: 'Product inserted', product: data, skipped: false };
    });
  }

  async updateProduct(uuid, updateData) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).update(updateData).eq('uuid', uuid).select().single();
      if (error) throw error;
      return data;
    });
  }

  async deleteProduct(uuid) {
    return this._executeQuery(async () => {
      const { error } = await this._supabase.from(TABLE).delete().eq('uuid', uuid);
      if (error) throw error;
      return 'Product deleted successfully';
    });
  }

  async getProductByUUID(uuid) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('uuid', uuid).single();
      if (error) throw error;
      return data;
    });
  }

  async getAllProducts() {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select();
      if (error) throw error;
      return data;
    });
  }

  async getProductsByLocation(locationId) {
    return this._executeQuery(async () => {
      const { data, error } = await this._supabase.from(TABLE).select().eq('location_id', String(locationId));
      if (error) throw error;
      return data;
    });
  }

  async getProductCount(locationId) {
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

  async *syncAllProductsFromSupabase(db) {
    const BATCH_SIZE = 500;
    const ID_BATCH_SIZE = 1000;
    const RECOVERY_BATCH_SIZE = 200;

    let processedCount = 0;
    let totalCount = 0;
    const errors = [];
    let isCancelled = false;
    const fetchedProductIds = new Set();

    const unsubConnectivity = internetConnectivityService.subscribe((connected) => {
      if (!connected) isCancelled = true;
    });

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

      // Get total count with retries
      for (let attempt = 1; attempt <= 3; attempt++) {
        totalCount = await this.getProductCount(locationId);
        if (totalCount > 0) break;
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          if (!await this._isInternetAvailable()) {
            yield { progress: 0, total: 0, errors: ['Lost internet connection while getting product count'] };
            return;
          }
        }
      }

      if (totalCount <= 0) {
        yield { progress: 0, total: 0, errors: [] };
        return;
      }

      yield { progress: 0, total: totalCount, errors: [], info: 'Getting product IDs from server...' };

      // Phase 1: Fetch all IDs
      let idOffset = 0;
      while (idOffset < totalCount && !isCancelled) {
        try {
          const { data } = await this._supabase
            .from(TABLE)
            .select('id')
            .eq('location_id', String(locationId))
            .range(idOffset, idOffset + ID_BATCH_SIZE - 1);
          if (!data?.length) break;
          for (const item of data) fetchedProductIds.add(String(item.id));
          idOffset += ID_BATCH_SIZE;
          yield { progress: 0, total: totalCount, errors: [], info: `Found ${fetchedProductIds.size}/${totalCount} product IDs` };
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          // continue despite ID fetch error
        }
      }

      yield { progress: 0, total: totalCount, errors: [], info: 'Starting product sync...' };

      // Phase 2: Fetch and save products in batches
      let offset = 0;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      while (offset < totalCount && !isCancelled && retryCount <= MAX_RETRIES) {
        if (!await this._isInternetAvailable()) {
          errors.push(`Internet connection lost at product ${offset + 1}. Sync paused.`);
          yield { progress: processedCount, total: totalCount, errors };
          return;
        }

        try {
          const { data: rows, error } = await this._supabase
            .from(TABLE)
            .select()
            .eq('location_id', String(locationId))
            .range(offset, offset + BATCH_SIZE - 1);

          if (error) throw error;
          if (!rows?.length) break;

          for (const json of rows) {
            try {
              delete json.name_embedding;
              let saved = false;
              for (let attempt = 0; attempt < 3 && !saved; attempt++) {
                try {
                  await db.products.createOrUpdate(json);
                  saved = true;
                  processedCount++;
                } catch (saveError) {
                  await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
                }
              }
              if (!saved) errors.push(`Failed to save product ${json.id} after 3 attempts`);
            } catch (e) {
              // skip individual parse errors
            }
          }

          yield { progress: processedCount, total: totalCount, errors, info: `Synced ${processedCount}/${totalCount} products` };
          offset += BATCH_SIZE;
          retryCount = 0;
          await new Promise(r => setTimeout(r, 100));
        } catch (apiError) {
          retryCount++;
          errors.push(`API Error (Offset ${offset}): ${String(apiError).slice(0, 100)}`);
          yield { progress: processedCount, total: totalCount, errors };
          await new Promise(r => setTimeout(r, retryCount * 1000));
        }
      }

      // Phase 3: Verify and recover missing products
      if (!isCancelled && fetchedProductIds.size > 0 && db) {
        yield { progress: processedCount, total: totalCount, errors, info: 'Verifying all products were synced...' };

        const savedIds = await db.products.getAllProductIds?.() ?? [];
        const savedIdSet = new Set(savedIds.map(String));
        const missingIds = [...fetchedProductIds].filter(id => !savedIdSet.has(id));

        if (missingIds.length > 0) {
          yield { progress: processedCount, total: totalCount, errors, info: `Syncing ${missingIds.length} missing products...` };

          for (let i = 0; i < missingIds.length && !isCancelled; i += RECOVERY_BATCH_SIZE) {
            const batch = missingIds.slice(i, i + RECOVERY_BATCH_SIZE);
            try {
              const filter = batch.map(id => `id.eq.${id}`).join(',');
              const { data: recoveryData } = await this._supabase.from(TABLE).select().or(filter);
              if (recoveryData?.length) {
                for (const json of recoveryData) {
                  delete json.name_embedding;
                  let saved = false;
                  for (let attempt = 0; attempt < 3 && !saved; attempt++) {
                    try { await db.products.createOrUpdate(json); saved = true; processedCount++; }
                    catch (_) { await new Promise(r => setTimeout(r, 200 * (attempt + 1))); }
                  }
                }
              }
            } catch (e) {
              // continue
            }
            yield { progress: processedCount, total: totalCount, errors, info: `Recovered ${i + 1}/${missingIds.length} missing products` };
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }

      if (isCancelled) errors.push('Sync cancelled due to internet connection loss');
    } catch (e) {
      errors.push('Unexpected Error: ' + e.toString());
    } finally {
      unsubConnectivity();
      fetchedProductIds.clear();

      let finalLocalCount = 0;
      if (db?.products?.getTotalProductsCount) {
        try { finalLocalCount = await db.products.getTotalProductsCount('0'); } catch (_) {}
      }

      yield {
        progress: finalLocalCount,
        total: totalCount,
        errors,
        info: `Sync completed: ${finalLocalCount} out of ${totalCount} products stored locally`,
      };
    }
  }
}

export const productsService = new ProductsService();

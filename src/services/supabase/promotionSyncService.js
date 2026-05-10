import { appService } from '../appService.js';

const TABLE = 'promotions';

export class PromotionSyncService {
  constructor(db) {
    this._db = db;
    this._channel = null;
  }

  get _supabase() { return appService.supabaseClient; }

  async syncToSupabase() {
    let uploaded = 0, failed = 0;
    try {
      const unsynced = await this._db.promotions.getUnsynced();
      if (!unsynced.length) return { uploaded: 0, downloaded: 0, failed: 0 };

      for (const promo of unsynced) {
        try {
          const { error } = await this._supabase.from(TABLE).upsert(this._toJson(promo));
          if (error) throw error;
          uploaded++;
        } catch (e) {
          console.error('Failed to sync promotion ' + promo.id + ':', e);
          failed++;
        }
      }

      if (uploaded > 0) {
        const syncedIds = unsynced.slice(0, uploaded).map(p => p.id);
        await this._db.promotions.markSynced(syncedIds);
      }
    } catch (e) {
      console.error('Sync to Supabase error:', e);
    }
    return { uploaded, downloaded: 0, failed };
  }

  async syncFromSupabase({ since } = {}) {
    let downloaded = 0;
    try {
      let query = this._supabase.from(TABLE).select();
      if (since) query = query.gte('updated_at', since instanceof Date ? since.toISOString() : since);

      const { data, error } = await query;
      if (error) throw error;

      await this._db.promotions.bulkInsert(data ?? []);
      downloaded = (data ?? []).length;
    } catch (e) {
      console.error('Sync from Supabase error:', e);
    }
    return { uploaded: 0, downloaded, failed: 0 };
  }

  async fullSync() {
    const uploadResult = await this.syncToSupabase();
    const downloadResult = await this.syncFromSupabase();
    return {
      uploaded: uploadResult.uploaded,
      downloaded: downloadResult.downloaded,
      failed: uploadResult.failed,
    };
  }

  async deleteFromSupabase(id) {
    try {
      const { error } = await this._supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Delete from Supabase error:', e);
      return false;
    }
  }

  setupRealtimeSync({ onInsert, onUpdate, onDelete }) {
    this._channel?.unsubscribe?.();
    this._channel = this._supabase
      .channel('promotions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            await this._db.promotions.insert(payload.new);
            onInsert?.(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            await this._db.promotions.updatePromotion(payload.new);
            onUpdate?.(payload.new);
          } else if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (id != null) {
              await this._db.promotions.deletePromotion(id);
              onDelete?.(id);
            }
          }
        } catch (e) {
          console.error('Realtime promotion error:', e);
        }
      })
      .subscribe();
  }

  disposeRealtimeSync() {
    this._channel?.unsubscribe?.();
    this._channel = null;
  }

  _toJson(promo) {
    return {
      id: promo.id,
      name: promo.name,
      description: promo.description,
      type: promo.type,
      applicable_product_ids: Array.isArray(promo.applicable_product_ids)
        ? promo.applicable_product_ids.join(',')
        : (promo.applicable_product_ids ?? ''),
      min_quantity: promo.min_quantity,
      discount_percent: promo.discount_percent,
      discount_amount: promo.discount_amount,
      free_product_id: promo.free_product_id,
      free_product_qty: promo.free_product_qty,
      discount_on_items: promo.discount_on_items,
      is_active: promo.is_active,
      start_date: promo.start_date,
      end_date: promo.end_date,
      priority: promo.priority,
      created_at: promo.created_at,
      updated_at: promo.updated_at,
    };
  }
}

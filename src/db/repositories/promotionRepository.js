export class PromotionRepository {
  constructor(db) {
    this.db = db;
  }

  async insert(promotion) {
    try {
      await this.db.execute(
        `INSERT OR REPLACE INTO promotions_table
          (id, name, description, type, applicable_product_ids, min_quantity,
           discount_percent, discount_amount, free_product_id, free_product_qty,
           discount_on_items, is_active, start_date, end_date, priority,
           created_at, updated_at, is_synced)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          promotion.id, promotion.name ?? null, promotion.description ?? null,
          promotion.type ?? 0,
          Array.isArray(promotion.applicableProductIds)
            ? promotion.applicableProductIds.join(',')
            : (promotion.applicable_product_ids ?? ''),
          promotion.minQuantity ?? promotion.min_quantity ?? null,
          promotion.discountPercent ?? promotion.discount_percent ?? null,
          promotion.discountAmount ?? promotion.discount_amount ?? null,
          promotion.freeProductId ?? promotion.free_product_id ?? null,
          promotion.freeProductQty ?? promotion.free_product_qty ?? null,
          promotion.discountOnItems ?? promotion.discount_on_items ?? null,
          promotion.isActive != null ? (promotion.isActive ? 1 : 0)
            : promotion.is_active != null ? (promotion.is_active ? 1 : 0) : null,
          promotion.startDate ?? promotion.start_date ?? null,
          promotion.endDate ?? promotion.end_date ?? null,
          promotion.priority ?? null,
          promotion.createdAt ?? promotion.created_at ?? null,
          promotion.updatedAt ?? promotion.updated_at ?? null,
          promotion.isSynced != null ? (promotion.isSynced ? 1 : 0)
            : promotion.is_synced != null ? (promotion.is_synced ? 1 : 0) : 0,
        ],
      );
      return true;
    } catch (e) {
      console.error('Error inserting promotion:', e);
      return false;
    }
  }

  async updatePromotion(promotion) {
    try {
      const now = new Date().toISOString();
      const result = await this.db.execute(
        `UPDATE promotions_table SET
          name=?, description=?, type=?, applicable_product_ids=?, min_quantity=?,
          discount_percent=?, discount_amount=?, free_product_id=?, free_product_qty=?,
          discount_on_items=?, is_active=?, start_date=?, end_date=?, priority=?,
          updated_at=?, is_synced=0
         WHERE id = ?`,
        [
          promotion.name ?? null, promotion.description ?? null,
          promotion.type ?? 0,
          Array.isArray(promotion.applicableProductIds)
            ? promotion.applicableProductIds.join(',')
            : (promotion.applicable_product_ids ?? ''),
          promotion.minQuantity ?? promotion.min_quantity ?? null,
          promotion.discountPercent ?? promotion.discount_percent ?? null,
          promotion.discountAmount ?? promotion.discount_amount ?? null,
          promotion.freeProductId ?? promotion.free_product_id ?? null,
          promotion.freeProductQty ?? promotion.free_product_qty ?? null,
          promotion.discountOnItems ?? promotion.discount_on_items ?? null,
          promotion.isActive != null ? (promotion.isActive ? 1 : 0)
            : promotion.is_active != null ? (promotion.is_active ? 1 : 0) : null,
          promotion.startDate ?? promotion.start_date ?? null,
          promotion.endDate ?? promotion.end_date ?? null,
          promotion.priority ?? null, now, promotion.id,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      console.error('Error updating promotion:', e);
      return false;
    }
  }

  async deletePromotion(id) {
    try {
      await this.db.execute(
        `DELETE FROM promotions_table WHERE id = ?`, [id],
      );
      return true;
    } catch (e) {
      console.error('Error deleting promotion:', e);
      return false;
    }
  }

  async getById(id) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM promotions_table WHERE id = ? LIMIT 1`, [id],
      );
      return row ? mapPromotion(row) : null;
    } catch (e) {
      return null;
    }
  }

  async getAll() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM promotions_table ORDER BY priority DESC, created_at DESC`,
      );
      return rows.map(mapPromotion);
    } catch (e) {
      return [];
    }
  }

  async getActive() {
    try {
      const now = new Date().toISOString();
      const rows = await this.db.select(
        `SELECT * FROM promotions_table
         WHERE is_active = 1
           AND (start_date IS NULL OR start_date <= ?)
           AND (end_date IS NULL OR end_date >= ?)
         ORDER BY priority DESC`,
        [now, now],
      );
      return rows.map(mapPromotion);
    } catch (e) {
      return [];
    }
  }

  async getForProduct(productId) {
    try {
      const now = new Date().toISOString();
      const rows = await this.db.select(
        `SELECT * FROM promotions_table
         WHERE is_active = 1
           AND applicable_product_ids LIKE ?
           AND (start_date IS NULL OR start_date <= ?)
           AND (end_date IS NULL OR end_date >= ?)
         ORDER BY priority DESC`,
        [`%${productId}%`, now, now],
      );
      return rows.map(mapPromotion);
    } catch (e) {
      return [];
    }
  }

  async getUnsynced() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM promotions_table WHERE is_synced = 0`,
      );
      return rows.map(mapPromotion);
    } catch (e) {
      return [];
    }
  }

  async markSynced(ids) {
    if (!ids.length) return;
    try {
      const placeholders = ids.map(() => '?').join(',');
      await this.db.execute(
        `UPDATE promotions_table SET is_synced = 1 WHERE id IN (${placeholders})`, ids,
      );
    } catch (e) {
      console.error('Error marking promotions as synced:', e);
    }
  }

  async bulkInsert(promotions) {
    if (!promotions.length) return;
    try {
      for (const p of promotions) {
        await this.insert({ ...p, isSynced: true });
      }
    } catch (e) {
      console.error('Error bulk inserting promotions:', e);
    }
  }

  watchAll(callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM promotions_table ORDER BY priority DESC, created_at DESC`,
      );
      callback(rows.map(mapPromotion));
    };
    run();
    return this.db.subscribe?.('promotions_table', run) ?? (() => {});
  }

  watchActive(callback) {
    const run = async () => {
      const results = await this.getActive();
      callback(results);
    };
    run();
    return this.db.subscribe?.('promotions_table', run) ?? (() => {});
  }

  watchForProduct(productId, callback) {
    const run = async () => {
      const results = await this.getForProduct(productId);
      callback(results);
    };
    run();
    return this.db.subscribe?.('promotions_table', run) ?? (() => {});
  }
}

function mapPromotion(row) {
  return {
    ...row,
    is_active: row.is_active === 1,
    is_synced: row.is_synced === 1,
    applicable_product_ids: row.applicable_product_ids
      ? row.applicable_product_ids.split(',').filter(Boolean)
      : [],
  };
}

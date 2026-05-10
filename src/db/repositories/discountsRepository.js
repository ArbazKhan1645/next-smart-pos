export class DiscountsRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateAll(discountsList) {
    for (const d of discountsList) {
      await this.db.execute(
        `INSERT OR REPLACE INTO discounts_table
          (uuid, id, name, discount_type_id, value, is_percentage, location_id,
           created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          d.uuid, d.id ?? null, d.name ?? null, d.discount_type_id ?? null,
          d.value ?? null,
          d.is_percentage != null ? (d.is_percentage ? 1 : 0) : null,
          d.location_id ?? null, d.created_at ?? null,
          d.updated_at ?? null, d.version ?? null,
        ],
      );
    }
  }

  async getDiscountsByType(discountType) {
    const rows = await this.db.select(
      `SELECT * FROM discounts_table WHERE discount_type_id = ?`, [discountType],
    );
    return rows.map(mapDiscount);
  }

  async getAllDiscounts() {
    const rows = await this.db.select(`SELECT * FROM discounts_table`);
    return rows.map(mapDiscount);
  }

  async getDiscountByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM discounts_table WHERE uuid = ? LIMIT 1`, [uuid],
    );
    return row ? mapDiscount(row) : null;
  }

  async deleteDiscount(uuid) {
    const result = await this.db.execute(
      `DELETE FROM discounts_table WHERE uuid = ?`, [uuid],
    );
    return result?.rowsAffected ?? 0;
  }
}

function mapDiscount(row) {
  return {
    ...row,
    is_percentage: row.is_percentage === 1,
  };
}

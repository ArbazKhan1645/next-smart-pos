export class MealDealJunctionRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateAll(junctions) {
    for (const j of junctions) {
      await this.db.execute(
        `INSERT OR REPLACE INTO meal_deal_junction_table
          (uuid, meal_deal_group_uuid, product_uuid, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?)`,
        [
          j.uuid, j.meal_deal_group_uuid ?? null, j.product_uuid ?? null,
          j.created_at ?? null, j.updated_at ?? null, j.version ?? null,
        ],
      );
    }
  }

  async getAllMealdealGroups() {
    const rows = await this.db.select(`SELECT * FROM meal_deal_junction_table`);
    return rows;
  }

  async getByGroupAndProductUuid({ groupUuid, productUuid }) {
    const [row] = await this.db.select(
      `SELECT * FROM meal_deal_junction_table
       WHERE meal_deal_group_uuid = ? AND product_uuid = ? LIMIT 1`,
      [groupUuid, productUuid],
    );
    return row ?? null;
  }

  async deleteByGroupAndProductUuid({ groupUuid, productUuid }) {
    await this.db.execute(
      `DELETE FROM meal_deal_junction_table
       WHERE meal_deal_group_uuid = ? AND product_uuid = ?`,
      [groupUuid, productUuid],
    );
  }
}

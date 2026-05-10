export class MealDealRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateAll(groups) {
    for (const g of groups) {
      await this.db.execute(
        `INSERT OR REPLACE INTO meal_deal_group_table
          (uuid, id, name, product_uuid, min_quantity, max_quantity,
           location_id, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          g.uuid, g.id ?? null, g.name ?? null, g.product_uuid ?? null,
          g.min_quantity ?? null, g.max_quantity ?? null,
          g.location_id ?? null, g.created_at ?? null,
          g.updated_at ?? null, g.version ?? null,
        ],
      );
    }
  }

  async deleteMealDealGroupWithJunctions(uuid) {
    await this.db.execute(
      `DELETE FROM meal_deal_junction_table WHERE meal_deal_group_uuid = ?`, [uuid],
    );
    await this.db.execute(
      `DELETE FROM meal_deal_group_table WHERE uuid = ?`, [uuid],
    );
  }

  async getAllMealdealGroups() {
    const rows = await this.db.select(`SELECT * FROM meal_deal_group_table`);
    return rows;
  }

  /**
   * Watch joined meal deal groups + their products for a given product UUID.
   * allProducts should be an array of product objects (with uuid field).
   * callback receives MealDealGroupWithProducts[].
   */
  watchJoinedDataByProduct({ productUuid, allProducts }, callback) {
    const productMap = new Map(allProducts.map(p => [p.uuid, p]));

    const run = async () => {
      const rows = await this.db.select(
        `SELECT g.*, j.product_uuid AS junction_product_uuid
         FROM meal_deal_group_table g
         INNER JOIN meal_deal_junction_table j ON j.meal_deal_group_uuid = g.uuid
         WHERE g.product_uuid = ?`,
        [productUuid],
      );

      const groupsMap = new Map();
      const junctionsMap = new Map();

      for (const row of rows) {
        const groupUuid = row.uuid;
        if (!groupsMap.has(groupUuid)) {
          groupsMap.set(groupUuid, row);
          junctionsMap.set(groupUuid, []);
        }
        if (row.junction_product_uuid) {
          junctionsMap.get(groupUuid).push(row.junction_product_uuid);
        }
      }

      const result = [...groupsMap.values()].map(group => {
        const junctionUuids = junctionsMap.get(group.uuid) ?? [];
        const products = junctionUuids
          .map(uuid => productMap.get(uuid))
          .filter(Boolean);
        return new MealDealGroupWithProducts({ group, products });
      });

      callback(result);
    };

    run();
    return this.db.subscribe?.('meal_deal_group_table', run) ?? (() => {});
  }
}

export class MealDealGroupWithProducts {
  constructor({ group, products }) {
    this.group = group;
    this.products = products;
  }
}

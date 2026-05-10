export class ModifierDisplayLevelsLocationsRepository {
  constructor(db) {
    this.db = db;
  }

  watchAllLocationModifiers(callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM modifier_display_levels_locations_table`,
      );
      callback(rows);
    };
    run();
    return this.db.subscribe?.('modifier_display_levels_locations_table', run) ?? (() => {});
  }

  async getAllLocationModifiers() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM modifier_display_levels_locations_table`,
      );
      return rows;
    } catch (e) {
      return [];
    }
  }

  async deleteByModifierGroupUuid(modifierGroupUuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM modifier_display_levels_locations_table WHERE modifier_group_uuid = ?`,
        [modifierGroupUuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async deleteByProductsUuid({ productUUID, modifierGroupUUID, modifieruid }) {
    try {
      const result = await this.db.execute(
        `DELETE FROM modifier_display_levels_locations_table
         WHERE product_uuid = ? AND modifier_group_uuid = ? AND modifier_uuid = ?`,
        [productUUID, modifierGroupUUID, modifieruid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async getDisplayLevelByProductUUIDs({ productUUID, modifierGroupUUID, modifieruid }) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM modifier_display_levels_locations_table
         WHERE product_uuid = ? AND modifier_group_uuid = ? AND modifier_uuid = ?`,
        [productUUID, modifierGroupUUID, modifieruid],
      );
      return rows;
    } catch (e) {
      return [];
    }
  }

  async insertLocationModifier(model) {
    try {
      return await this.db.execute(
        `INSERT INTO modifier_display_levels_locations_table
          (id, uuid, updated_at, version, location_id, modifier_group_uuid,
           created_at, modifier_uuid, product_uuid, sale_price)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          model.id ?? null, model.uuid, model.updated_at ?? null,
          model.version ?? null, model.location_id ?? null,
          model.modifier_group_uuid ?? null, model.created_at ?? null,
          model.modifier_uuid ?? null, model.product_uuid ?? null,
          model.sale_price ?? null,
        ],
      );
    } catch (e) {
      console.error('insertLocationModifier (mdl) error:', e);
      return -1;
    }
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO modifier_display_levels_locations_table
            (id, uuid, updated_at, version, location_id, modifier_group_uuid,
             created_at, modifier_uuid, product_uuid, sale_price)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            s.id ?? null, s.uuid, s.updated_at ?? null, s.version ?? null,
            s.location_id ?? null, s.modifier_group_uuid ?? null,
            s.created_at ?? null, s.modifier_uuid ?? null,
            s.product_uuid ?? null, s.sale_price ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll modifierDisplayLevels error:', e);
      return -99999;
    }
  }
}

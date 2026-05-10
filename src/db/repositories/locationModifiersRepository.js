export class LocationModifiersRepository {
  constructor(db) {
    this.db = db;
  }

  watchAllLocationModifiers(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM location_modifiers_table`);
      callback(rows.map(mapLocationModifier));
    };
    run();
    return this.db.subscribe?.('location_modifiers_table', run) ?? (() => {});
  }

  async getAllLocationModifiers() {
    try {
      const rows = await this.db.select(`SELECT * FROM location_modifiers_table`);
      return rows.map(mapLocationModifier);
    } catch (e) {
      return [];
    }
  }

  async getLocationModifierByUuid(uuid) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM location_modifiers_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      return row ? mapLocationModifier(row) : null;
    } catch (e) {
      return null;
    }
  }

  async insertLocationModifier(modifier) {
    try {
      return await this.db.execute(
        `INSERT INTO location_modifiers_table
          (uuid, id, name, cost_price, base_price, tax_uuid, tax_type_uuid,
           merge, open_price, custom_name, location_id, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          modifier.uuid, modifier.id ?? null, modifier.name ?? null,
          modifier.cost_price ?? null, modifier.base_price ?? null,
          modifier.tax_uuid ?? null, modifier.tax_type_uuid ?? null,
          modifier.merge != null ? (modifier.merge ? 1 : 0) : null,
          modifier.open_price != null ? (modifier.open_price ? 1 : 0) : null,
          modifier.custom_name != null ? (modifier.custom_name ? 1 : 0) : null,
          modifier.location_id ?? null, modifier.created_at ?? null,
          modifier.updated_at ?? null, modifier.version ?? null,
        ],
      );
    } catch (e) {
      console.error('insertLocationModifier error:', e);
      return -1;
    }
  }

  async updateLocationModifier(modifier) {
    try {
      const result = await this.db.execute(
        `UPDATE location_modifiers_table SET name=?, cost_price=?, base_price=?,
          tax_uuid=?, tax_type_uuid=?, merge=?, open_price=?, custom_name=?, updated_at=?
         WHERE uuid = ?`,
        [
          modifier.name ?? null, modifier.cost_price ?? null,
          modifier.base_price ?? null, modifier.tax_uuid ?? null,
          modifier.tax_type_uuid ?? null,
          modifier.merge != null ? (modifier.merge ? 1 : 0) : null,
          modifier.open_price != null ? (modifier.open_price ? 1 : 0) : null,
          modifier.custom_name != null ? (modifier.custom_name ? 1 : 0) : null,
          modifier.updated_at ?? null, modifier.uuid,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      return false;
    }
  }

  async deleteLocationModifier(modifier) {
    try {
      const result = await this.db.execute(
        `DELETE FROM location_modifiers_table WHERE uuid = ?`, [modifier.uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async createOrUpdateAll(samples) {
    try {
      for (const m of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO location_modifiers_table
            (uuid, id, name, cost_price, base_price, tax_uuid, tax_type_uuid,
             merge, open_price, custom_name, location_id, created_at, updated_at, version)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            m.uuid, m.id ?? null, m.name ?? null, m.cost_price ?? null,
            m.base_price ?? null, m.tax_uuid ?? null, m.tax_type_uuid ?? null,
            m.merge != null ? (m.merge ? 1 : 0) : null,
            m.open_price != null ? (m.open_price ? 1 : 0) : null,
            m.custom_name != null ? (m.custom_name ? 1 : 0) : null,
            m.location_id ?? null, m.created_at ?? null,
            m.updated_at ?? null, m.version ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll locationModifiers error:', e);
      return -99999;
    }
  }
}

function mapLocationModifier(row) {
  return {
    ...row,
    merge: row.merge === 1,
    open_price: row.open_price === 1,
    custom_name: row.custom_name === 1,
  };
}

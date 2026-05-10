export class ModifiersGroupRepository {
  constructor(db) {
    this.db = db;
  }

  watchAllLocationModifiers(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM modifier_groups_table`);
      callback(rows.map(mapModifierGroup));
    };
    run();
    return this.db.subscribe?.('modifier_groups_table', run) ?? (() => {});
  }

  async getAllModifierGroups() {
    try {
      const rows = await this.db.select(`SELECT * FROM modifier_groups_table`);
      return rows.map(mapModifierGroup);
    } catch (e) {
      return [];
    }
  }

  async insertModifierGroup(group) {
    try {
      return await this.db.execute(
        `INSERT OR REPLACE INTO modifier_groups_table
          (uuid, id, name, minimum, maximum, background_color, text_color,
           button_height, location_id, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          group.uuid, group.id ?? null, group.name ?? null,
          group.minimum ?? null, group.maximum ?? null,
          group.background_color ?? null, group.text_color ?? null,
          group.button_height ?? null, group.location_id ?? null,
          group.created_at ?? null, group.updated_at ?? null, group.version ?? null,
        ],
      );
    } catch (e) {
      console.error('insertModifierGroup error:', e);
      return -1;
    }
  }

  async updateModifierGroup(group) {
    try {
      const result = await this.db.execute(
        `UPDATE modifier_groups_table SET name=?, minimum=?, maximum=?,
          background_color=?, text_color=?, button_height=?, updated_at=?
         WHERE uuid = ?`,
        [
          group.name ?? null, group.minimum ?? null, group.maximum ?? null,
          group.background_color ?? null, group.text_color ?? null,
          group.button_height ?? null, group.updated_at ?? null, group.uuid,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      return false;
    }
  }

  async deleteModifierGroup(uuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM modifier_groups_table WHERE uuid = ?`, [uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async createOrUpdateAll(samples) {
    try {
      for (const g of samples) {
        await this.insertModifierGroup(g);
      }
    } catch (e) {
      console.error('createOrUpdateAll modifierGroups error:', e);
      return -99999;
    }
  }
}

function mapModifierGroup(row) {
  return { ...row };
}

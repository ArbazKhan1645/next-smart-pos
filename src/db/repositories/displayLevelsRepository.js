export class DisplayLevelsRepository {
  constructor(db) {
    this.db = db;
  }

  watchAllDisplayLevels(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM display_levels_table`);
      callback(rows);
    };
    run();
    return this.db.subscribe?.('display_levels_table', run) ?? (() => {});
  }

  async getAllDisplayLevel() {
    const rows = await this.db.select(`SELECT * FROM display_levels_table`);
    return rows;
  }

  async deleteDisplayLevel(uuid) {
    if (!uuid) return -99999;
    try {
      const result = await this.db.execute(
        `DELETE FROM display_levels_table WHERE uuid = ?`, [uuid],
      );
      return result?.rowsAffected ?? -99999;
    } catch (e) {
      return -99999;
    }
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO display_levels_table
            (uuid, id, name, location_id, created_at, updated_at, version)
           VALUES (?,?,?,?,?,?,?)`,
          [
            s.uuid, s.id ?? null, s.name ?? null, s.location_id ?? null,
            s.created_at ?? null, s.updated_at ?? null, s.version ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll displayLevels error:', e);
      return -99999;
    }
  }
}

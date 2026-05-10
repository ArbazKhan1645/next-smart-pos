export class UnitsRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateAll(samples) {
    for (const u of samples) {
      await this.db.execute(
        `INSERT OR REPLACE INTO units_table
          (uuid, id, name, abbreviation, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?)`,
        [
          u.uuid, u.id ?? null, u.name ?? null, u.abbreviation ?? null,
          u.created_at ?? null, u.updated_at ?? null, u.version ?? null,
        ],
      );
    }
  }

  async getAllUnits() {
    const rows = await this.db.select(`SELECT * FROM units_table`);
    return rows;
  }

  async getUnitByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM units_table WHERE uuid = ? LIMIT 1`, [uuid],
    );
    return row ?? null;
  }
}

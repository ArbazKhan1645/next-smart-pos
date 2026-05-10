export class ServiceTypeRepository {
  constructor(db) {
    this.db = db;
  }

  _filterPosTypes(rows) {
    return rows.filter(s => s.id !== 4 && s.id !== 5 && s.id !== 6);
  }

  watchAllServiceTypes(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM service_type_table`);
      callback(this._filterPosTypes(rows));
    };
    run();
    return this.db.subscribe?.('service_type_table', run) ?? (() => {});
  }

  async getAllServicesTypes() {
    const rows = await this.db.select(`SELECT * FROM service_type_table`);
    return this._filterPosTypes(rows);
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO service_type_table
            (id, name, description, created_at, updated_at)
           VALUES (?,?,?,?,?)`,
          [
            s.id, s.name ?? null, s.description ?? null,
            s.created_at ?? null, s.updated_at ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll serviceTypes error:', e);
      return -99999;
    }
  }
}

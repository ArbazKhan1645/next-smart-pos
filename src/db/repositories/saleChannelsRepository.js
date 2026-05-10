export class SaleChannelsRepository {
  constructor(db) {
    this.db = db;
  }

  watchAllSaleChannels(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM sale_channels_table`);
      callback(rows);
    };
    run();
    return this.db.subscribe?.('sale_channels_table', run) ?? (() => {});
  }

  async getAllSaleChannels() {
    const rows = await this.db.select(`SELECT * FROM sale_channels_table`);
    return rows;
  }

  async getSaleChannelsByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.db.select(
      `SELECT * FROM sale_channels_table WHERE id IN (${placeholders})`, ids,
    );
    return rows;
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO sale_channels_table
            (uuid, id, name, description, created_at, updated_at, version)
           VALUES (?,?,?,?,?,?,?)`,
          [
            s.uuid, s.id ?? null, s.name ?? null, s.description ?? null,
            s.created_at ?? null, s.updated_at ?? null, s.version ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll saleChannels error:', e);
      return -99999;
    }
  }
}

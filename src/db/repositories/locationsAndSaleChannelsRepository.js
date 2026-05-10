export class LocationsAndSaleChannelsRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllLocationsAndSaleChannels() {
    const rows = await this.db.select(
      `SELECT * FROM locations_and_sale_channels_table`,
    );
    return rows;
  }

  async existsBySaleChannelId(saleChannelId) {
    const rows = await this.db.select(
      `SELECT 1 FROM locations_and_sale_channels_table WHERE sale_channel_id = ? LIMIT 1`,
      [saleChannelId],
    );
    return rows.length > 0;
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO locations_and_sale_channels_table
            (uuid, id, location_id, sale_channel_id, created_at, updated_at, version)
           VALUES (?,?,?,?,?,?,?)`,
          [
            s.uuid, s.id ?? null, s.location_id ?? null,
            s.sale_channel_id ?? null, s.created_at ?? null,
            s.updated_at ?? null, s.version ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll locationsAndSaleChannels error:', e);
      return -99999;
    }
  }
}

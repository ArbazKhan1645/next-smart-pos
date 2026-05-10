export class ServiceRepository {
  constructor(db) {
    this.db = db;
  }

  // service_type_id 4,5,6 are internal/system types — excluded from POS views
  _filterPosServices(rows) {
    return rows.filter(s => s.service_type_id !== 4 && s.service_type_id !== 5 && s.service_type_id !== 6);
  }

  watchAllServices(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM service_table`);
      callback(this._filterPosServices(rows.map(mapService)));
    };
    run();
    return this.db.subscribe?.('service_table', run) ?? (() => {});
  }

  async getAllServices() {
    const rows = await this.db.select(`SELECT * FROM service_table`);
    return this._filterPosServices(rows.map(mapService));
  }

  async getServiceByUuid(uuid) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM service_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      return row ? mapService(row) : null;
    } catch (e) {
      return null;
    }
  }

  async updateServeMinTime(uuid, minTime) {
    try {
      const result = await this.db.execute(
        `UPDATE service_table SET serve_min_time = ? WHERE uuid = ?`, [minTime, uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async updateServeMaxTime(uuid, maxTime) {
    try {
      const result = await this.db.execute(
        `UPDATE service_table SET serve_max_time = ? WHERE uuid = ?`, [maxTime, uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async getServicesBySaleChannelId(saleChannelId) {
    const rows = await this.db.select(`SELECT * FROM service_table`);
    return this._filterPosServices(rows.map(mapService)).filter(s => {
      const channels = s.sale_channels;
      return Array.isArray(channels) && channels.some(ch => ch.id === saleChannelId);
    });
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.db.execute(
          `INSERT OR REPLACE INTO service_table
            (uuid, id, name, icon_data, display_level_uuid, service_type_id,
             sale_channels, location_id, serve_min_time, serve_max_time,
             version, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            s.uuid, s.id ?? null, s.name ?? null, s.icon_data ?? null,
            s.display_level_uuid ?? null, s.service_type_id ?? null,
            s.sale_channels ? JSON.stringify(s.sale_channels) : null,
            s.location_id ?? null, s.serve_min_time ?? null,
            s.serve_max_time ?? null, s.version ?? null,
            s.created_at ?? null, s.updated_at ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll services error:', e);
      return -99999;
    }
  }

  async updateService(service) {
    try {
      const result = await this.db.execute(
        `UPDATE service_table SET name=?, icon_data=?, display_level_uuid=?,
          service_type_id=?, sale_channels=?, location_id=?, serve_min_time=?,
          serve_max_time=?, version=?, updated_at=?
         WHERE uuid = ?`,
        [
          service.name ?? null, service.icon_data ?? null,
          service.display_level_uuid ?? null, service.service_type_id ?? null,
          service.sale_channels ? JSON.stringify(service.sale_channels) : null,
          service.location_id ?? null, service.serve_min_time ?? null,
          service.serve_max_time ?? null, service.version ?? null,
          service.updated_at ?? null, service.uuid ?? '',
        ],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async deleteService(uuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM service_table WHERE uuid = ?`, [uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async deleteServices(uuids) {
    try {
      if (!uuids.length) return 0;
      const placeholders = uuids.map(() => '?').join(',');
      const result = await this.db.execute(
        `DELETE FROM service_table WHERE uuid IN (${placeholders})`, uuids,
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async getServicesByType(typeId) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM service_table WHERE service_type_id = ?`, [typeId],
      );
      return rows.map(mapService);
    } catch (e) {
      return [];
    }
  }

  async getServicesByDisplayLevel(displayLevelUuid) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM service_table WHERE display_level_uuid = ?`, [displayLevelUuid],
      );
      return rows.map(mapService);
    } catch (e) {
      return [];
    }
  }

  async searchServicesByName(query) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM service_table WHERE name LIKE ?`, [`%${query}%`],
      );
      return rows.map(mapService);
    } catch (e) {
      return [];
    }
  }

  async getServicesByLocation(locationId) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM service_table WHERE location_id = ?`, [locationId],
      );
      return rows.map(mapService);
    } catch (e) {
      return [];
    }
  }

  async batchUpdateServeTimes(updates) {
    for (const [uuid, times] of Object.entries(updates)) {
      const sets = [];
      const vals = [];
      if ('min' in times) { sets.push('serve_min_time = ?'); vals.push(times.min); }
      if ('max' in times) { sets.push('serve_max_time = ?'); vals.push(times.max); }
      if (!sets.length) continue;
      vals.push(uuid);
      await this.db.execute(
        `UPDATE service_table SET ${sets.join(', ')} WHERE uuid = ?`, vals,
      );
    }
  }

  async serviceExists(uuid) {
    try {
      const [row] = await this.db.select(
        `SELECT 1 FROM service_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      return !!row;
    } catch (e) {
      return false;
    }
  }

  async getServicesCount() {
    try {
      const [row] = await this.db.select(
        `SELECT COUNT(*) AS count FROM service_table`,
      );
      return row?.count ?? 0;
    } catch (e) {
      return 0;
    }
  }

  async clearAllServices() {
    try {
      const result = await this.db.execute(`DELETE FROM service_table`);
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }
}

function mapService(row) {
  return {
    ...row,
    sale_channels: row.sale_channels ? JSON.parse(row.sale_channels) : null,
  };
}

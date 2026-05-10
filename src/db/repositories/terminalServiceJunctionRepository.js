export class TerminalsServiceJunctionRepository {
  constructor(db) {
    this.db = db;
  }

  async createTerminalServiceJunction(junction) {
    return this.db.execute(
      `INSERT INTO terminal_service_junction_table
        (uuid, service_uuid, display_level_uuid, terminal_id, location_id,
         sale_channel_id, is_active, is_available, is_default, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        junction.uuid, junction.service_uuid ?? null,
        junction.display_level_uuid ?? null, junction.terminal_id ?? null,
        junction.location_id ?? null, junction.sale_channel_id ?? null,
        junction.is_active != null ? (junction.is_active ? 1 : 0) : null,
        junction.is_available != null ? (junction.is_available ? 1 : 0) : null,
        junction.is_default != null ? (junction.is_default ? 1 : 0) : null,
        junction.created_at ?? null, junction.updated_at ?? null,
      ],
    );
  }

  async getAllTerminalServiceJunctions() {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table`,
    );
    return rows.map(mapJunction);
  }

  watchAllTerminalServiceJunctions(callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM terminal_service_junction_table`,
      );
      callback(rows.map(mapJunction));
    };
    run();
    return this.db.subscribe?.('terminal_service_junction_table', run) ?? (() => {});
  }

  async getTerminalServiceJunctionByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE uuid = ? LIMIT 1`, [uuid],
    );
    return row ? mapJunction(row) : null;
  }

  async getTerminalServiceJunctionsByTerminalId(terminalId) {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE terminal_id = ?`, [terminalId],
    );
    return rows.map(mapJunction);
  }

  async getTerminalServiceJunctionsByServiceUuid(serviceUuid) {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE service_uuid = ?`, [serviceUuid],
    );
    return rows.map(mapJunction);
  }

  async getTerminalServiceJunctionsByDisplayLevelUuid(displayLevelUuid) {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE display_level_uuid = ?`,
      [displayLevelUuid],
    );
    return rows.map(mapJunction);
  }

  async getTerminalServiceJunctionsByLocationId(locationId) {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE location_id = ?`, [locationId],
    );
    return rows.map(mapJunction);
  }

  async getTerminalServiceJunctionsBySaleChannelId(saleChannelId) {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE sale_channel_id = ?`,
      [saleChannelId],
    );
    return rows.map(mapJunction);
  }

  async getAvailableTerminalServiceJunctions() {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE is_available = 1`,
    );
    return rows.map(mapJunction);
  }

  async getDefaultTerminalServiceJunctions() {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE is_default = 1`,
    );
    return rows.map(mapJunction);
  }

  async getActiveTerminalServiceJunctions() {
    const rows = await this.db.select(
      `SELECT * FROM terminal_service_junction_table WHERE is_active = 1`,
    );
    return rows.map(mapJunction);
  }

  async updateTerminalServiceJunction(uuid, fields) {
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const vals = [...Object.values(fields), uuid];
    const result = await this.db.execute(
      `UPDATE terminal_service_junction_table SET ${sets} WHERE uuid = ?`, vals,
    );
    return (result?.rowsAffected ?? 0) > 0;
  }

  async toggleAvailability(uuid, isAvailable) {
    const result = await this.db.execute(
      `UPDATE terminal_service_junction_table SET is_available = ?, updated_at = ? WHERE uuid = ?`,
      [isAvailable ? 1 : 0, new Date().toISOString(), uuid],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }

  async toggleActiveStatus(uuid, isActive) {
    const result = await this.db.execute(
      `UPDATE terminal_service_junction_table SET is_active = ?, updated_at = ? WHERE uuid = ?`,
      [isActive ? 1 : 0, new Date().toISOString(), uuid],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }

  async deleteTerminalServiceJunction(uuid) {
    const result = await this.db.execute(
      `DELETE FROM terminal_service_junction_table WHERE uuid = ?`, [uuid],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }

  async deleteAllTerminalServiceJunctions() {
    const result = await this.db.execute(
      `DELETE FROM terminal_service_junction_table`,
    );
    return result?.rowsAffected ?? 0;
  }

  async countAllTerminalServiceJunctions() {
    const [row] = await this.db.select(
      `SELECT COUNT(*) AS count FROM terminal_service_junction_table`,
    );
    return row?.count ?? 0;
  }

  async exists(uuid) {
    const result = await this.getTerminalServiceJunctionByUuid(uuid);
    return result !== null;
  }

  async upsertTerminalServiceJunction(junction) {
    await this.db.execute(
      `INSERT OR REPLACE INTO terminal_service_junction_table
        (uuid, service_uuid, display_level_uuid, terminal_id, location_id,
         sale_channel_id, is_active, is_available, is_default, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        junction.uuid, junction.service_uuid ?? null,
        junction.display_level_uuid ?? null, junction.terminal_id ?? null,
        junction.location_id ?? null, junction.sale_channel_id ?? null,
        junction.is_active != null ? (junction.is_active ? 1 : 0) : null,
        junction.is_available != null ? (junction.is_available ? 1 : 0) : null,
        junction.is_default != null ? (junction.is_default ? 1 : 0) : null,
        junction.created_at ?? null, junction.updated_at ?? null,
      ],
    );
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.upsertTerminalServiceJunction(s);
      }
    } catch (e) {
      console.error('createOrUpdateAll terminalServiceJunction error:', e);
      return -99999;
    }
  }

  async toggleOnlyOneActiveByServiceUuid(serviceUuid) {
    try {
      await this.db.execute(
        `UPDATE terminal_service_junction_table SET is_active = 0, updated_at = ?`,
        [new Date().toISOString()],
      );
      const result = await this.db.execute(
        `UPDATE terminal_service_junction_table SET is_active = 1, updated_at = ?
         WHERE service_uuid = ?`,
        [new Date().toISOString(), serviceUuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      return false;
    }
  }
}

function mapJunction(row) {
  return {
    ...row,
    is_active: row.is_active === 1,
    is_available: row.is_available === 1,
    is_default: row.is_default === 1,
  };
}

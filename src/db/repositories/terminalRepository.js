export class TerminalsRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateAll(terminals) {
    for (const t of terminals) {
      await this.db.execute(
        `INSERT OR REPLACE INTO terminals_table
          (uuid, id, name, location_id, is_active, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          t.uuid, t.id ?? null, t.name ?? null, t.location_id ?? null,
          t.is_active != null ? (t.is_active ? 1 : 0) : null,
          t.created_at ?? null, t.updated_at ?? null, t.version ?? null,
        ],
      );
    }
  }

  async getAllTerminals() {
    const rows = await this.db.select(`SELECT * FROM terminals_table`);
    return rows.map(mapTerminal);
  }

  async getTerminalByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM terminals_table WHERE uuid = ? LIMIT 1`, [uuid],
    );
    return row ? mapTerminal(row) : null;
  }

  async deleteTerminal(uuid) {
    const result = await this.db.execute(
      `DELETE FROM terminals_table WHERE uuid = ?`, [uuid],
    );
    return result?.rowsAffected ?? -1;
  }
}

function mapTerminal(row) {
  return {
    ...row,
    is_active: row.is_active === 1,
  };
}

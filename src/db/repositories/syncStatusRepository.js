export class SyncStatusRepository {
  constructor(db) {
    this.db = db;
  }

  async updateLastSyncTime(time) {
    const timestamp = time instanceof Date ? time.getTime() : time;
    const [existing] = await this.db.select(
      `SELECT id FROM sync_status_table WHERE id = 1`,
    );
    if (existing) {
      await this.db.execute(
        `UPDATE sync_status_table SET last_sync_time = ? WHERE id = 1`,
        [timestamp],
      );
    } else {
      await this.db.execute(
        `INSERT INTO sync_status_table (id, last_sync_time) VALUES (1, ?)`,
        [timestamp],
      );
    }
  }

  async getLastSyncTime() {
    const [row] = await this.db.select(
      `SELECT last_sync_time FROM sync_status_table WHERE id = 1`,
    );
    return row ? new Date(row.last_sync_time) : null;
  }
}

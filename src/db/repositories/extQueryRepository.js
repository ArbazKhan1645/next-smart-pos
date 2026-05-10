export class ExtQueryRepository {
  constructor(db) {
    this.db = db;
  }

  async insertItem(model) {
    try {
      return await this.db.execute(
        `INSERT OR REPLACE INTO ext_query_table
          (id, uuid, created_at, operation_at, updated_at, deleted_at, synced_at,
           version, supabase_id, microservice_id, entity, operation, entity_id,
           location_id, retry_count, is_defective, error_message)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          model.id != null ? String(model.id) : null,
          model.uuid != null ? String(model.uuid) : null,
          model.created_at ?? null, model.operation_at ?? null,
          model.updated_at ?? null, model.deleted_at ?? null,
          model.synced_at ?? null, model.version ?? null,
          model.supabase_id ?? null, model.microservice_id ?? null,
          model.entity ?? null, model.operation ?? null,
          model.entity_id ?? null, model.location_id ?? null,
          0, 0, null,
        ],
      );
    } catch (e) {
      throw new Error(`ExtQueryRepository.insertItem: ${e}`);
    }
  }

  watchRecordsOfExt({ includeDefective = false } = {}, callback) {
    const run = async () => {
      const rows = includeDefective
        ? await this.db.select(`SELECT * FROM ext_query_table`)
        : await this.db.select(`SELECT * FROM ext_query_table WHERE is_defective = 0`);
      callback(rows.map(mapExtQuery));
    };
    run();
    return this.db.subscribe?.('ext_query_table', run) ?? (() => {});
  }

  async getAllNonDefectiveQuesRecords() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM ext_query_table WHERE is_defective = 0`,
      );
      return rows.map(mapExtQuery);
    } catch (e) {
      throw new Error(`ExtQueryRepository.getAllNonDefective: ${e}`);
    }
  }

  async getAllQuesRecords() {
    try {
      const rows = await this.db.select(`SELECT * FROM ext_query_table`);
      return rows.map(mapExtQuery);
    } catch (e) {
      throw new Error(`ExtQueryRepository.getAll: ${e}`);
    }
  }

  async getDefectiveRecords() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM ext_query_table WHERE is_defective = 1`,
      );
      return rows.map(mapExtQuery);
    } catch (e) {
      throw new Error(`ExtQueryRepository.getDefective: ${e}`);
    }
  }

  async markRecordAsDefective(uuid, { errorMessage } = {}) {
    try {
      const result = await this.db.execute(
        `UPDATE ext_query_table SET is_defective = 1, error_message = ?, retry_count = 0,
          updated_at = ? WHERE uuid = ?`,
        [errorMessage ?? null, new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.markDefective: ${e}`);
    }
  }

  async incrementRetryCount(uuid) {
    try {
      const [record] = await this.db.select(
        `SELECT retry_count FROM ext_query_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      if (!record) return false;
      const newCount = (record.retry_count ?? 0) + 1;
      const result = await this.db.execute(
        `UPDATE ext_query_table SET retry_count = ?, updated_at = ? WHERE uuid = ?`,
        [newCount, new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.incrementRetry: ${e}`);
    }
  }

  async resetDefectiveRecords() {
    try {
      const result = await this.db.execute(
        `UPDATE ext_query_table SET is_defective = 0, error_message = NULL,
          retry_count = 0, updated_at = ? WHERE is_defective = 1`,
        [new Date().toISOString()],
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.resetDefective: ${e}`);
    }
  }

  async resetDefectiveRecord(uuid) {
    try {
      const result = await this.db.execute(
        `UPDATE ext_query_table SET is_defective = 0, error_message = NULL,
          retry_count = 0, updated_at = ? WHERE uuid = ? AND is_defective = 1`,
        [new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.resetDefectiveRecord: ${e}`);
    }
  }

  async deleteRecord(uuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM ext_query_table WHERE uuid = ?`, [uuid],
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.deleteRecord: ${e}`);
    }
  }

  async deleteAllDefectiveRecords() {
    try {
      const result = await this.db.execute(
        `DELETE FROM ext_query_table WHERE is_defective = 1`,
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.deleteAllDefective: ${e}`);
    }
  }

  async getSyncStatistics() {
    try {
      const rows = await this.db.select(`SELECT * FROM ext_query_table`);
      const defective = rows.filter(r => r.is_defective).length;
      return {
        total: rows.length,
        pending: rows.length - defective,
        defective,
      };
    } catch (e) {
      throw new Error(`ExtQueryRepository.getSyncStats: ${e}`);
    }
  }

  async getRecordsByOperation(operation, { includeDefective = false } = {}) {
    try {
      let sql = `SELECT * FROM ext_query_table WHERE operation = ?`;
      const params = [operation];
      if (!includeDefective) { sql += ` AND is_defective = 0`; }
      const rows = await this.db.select(sql, params);
      return rows.map(mapExtQuery);
    } catch (e) {
      throw new Error(`ExtQueryRepository.getByOperation: ${e}`);
    }
  }

  async getRecordsByEntity(entity, { includeDefective = false } = {}) {
    try {
      let sql = `SELECT * FROM ext_query_table WHERE entity = ?`;
      const params = [entity];
      if (!includeDefective) { sql += ` AND is_defective = 0`; }
      const rows = await this.db.select(sql, params);
      return rows.map(mapExtQuery);
    } catch (e) {
      throw new Error(`ExtQueryRepository.getByEntity: ${e}`);
    }
  }

  async clearAllRecords() {
    try {
      const result = await this.db.execute(`DELETE FROM ext_query_table`);
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`ExtQueryRepository.clearAll: ${e}`);
    }
  }
}

function mapExtQuery(row) {
  return {
    ...row,
    is_defective: row.is_defective === 1,
  };
}

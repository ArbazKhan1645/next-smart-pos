export class PrintJobsRepository {
  constructor(db) {
    this.db = db;
  }

  // ── CREATE ────────────────────────────────────────────────────────────────

  async insertJob(job) {
    try {
      return await this.db.execute(
        `INSERT INTO print_jobs_table
          (uuid, order_uuid, printer_config_uuid, hardware_printer_address,
           job_type, status, priority, payload, retry_count, max_retries,
           error_message, created_at, processed_at, completed_at, scheduled_at,
           category_uuid, products)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          job.uuid, job.orderUuid ?? null, job.printerConfigUuid ?? null,
          job.hardwarePrinterAddress ?? null,
          job.jobType ?? 'receipt', job.status ?? 'pending',
          job.priority ?? 'normal',
          job.payload ? JSON.stringify(job.payload) : null,
          job.retryCount ?? 0, job.maxRetries ?? 3,
          job.errorMessage ?? null,
          job.createdAt ?? new Date().toISOString(),
          job.processedAt ?? null, job.completedAt ?? null,
          job.scheduledAt ?? null, job.categoryUuid ?? null,
          job.products ? JSON.stringify(job.products) : null,
        ],
      );
    } catch (e) {
      throw new Error(`PrintJobsRepository.insertJob: ${e}`);
    }
  }

  async insertJobs(jobs) {
    try {
      for (const job of jobs) {
        await this.insertJob(job);
      }
    } catch (e) {
      throw new Error(`PrintJobsRepository.insertJobs: ${e}`);
    }
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  async getAllJobs() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table ORDER BY created_at DESC`,
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getAllJobs: ${e}`);
    }
  }

  watchAllJobs(callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table ORDER BY created_at DESC`,
      );
      callback(rows.map(mapPrintJob));
    };
    run();
    return this.db.subscribe?.('print_jobs_table', run) ?? (() => {});
  }

  async getJobByUuid(uuid) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM print_jobs_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      return row ? mapPrintJob(row) : null;
    } catch (e) {
      throw new Error(`PrintJobsRepository.getJobByUuid: ${e}`);
    }
  }

  async getPendingJobs() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table
         WHERE status = 'pending' OR status = 'retrying'
         ORDER BY priority ASC, created_at ASC`,
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getPendingJobs: ${e}`);
    }
  }

  watchPendingJobs(callback) {
    const run = async () => {
      const rows = await this.getPendingJobs();
      callback(rows);
    };
    run();
    return this.db.subscribe?.('print_jobs_table', run) ?? (() => {});
  }

  async getJobsByOrder(orderUuid) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table WHERE order_uuid = ? ORDER BY created_at DESC`,
        [orderUuid],
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getJobsByOrder: ${e}`);
    }
  }

  async getJobsByPrinter(printerConfigUuid) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table WHERE printer_config_uuid = ? ORDER BY created_at DESC`,
        [printerConfigUuid],
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getJobsByPrinter: ${e}`);
    }
  }

  async getJobsByStatus(status) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table WHERE status = ? ORDER BY created_at DESC`,
        [status],
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getJobsByStatus: ${e}`);
    }
  }

  async getRetryableJobs() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table
         WHERE status = 'failed' AND retry_count < 3
         ORDER BY created_at ASC`,
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getRetryableJobs: ${e}`);
    }
  }

  async getJobsInRange(start, end) {
    try {
      const startStr = start instanceof Date ? start.toISOString() : start;
      const endStr = end instanceof Date ? end.toISOString() : end;
      const rows = await this.db.select(
        `SELECT * FROM print_jobs_table
         WHERE created_at >= ? AND created_at <= ?
         ORDER BY created_at DESC`,
        [startStr, endStr],
      );
      return rows.map(mapPrintJob);
    } catch (e) {
      throw new Error(`PrintJobsRepository.getJobsInRange: ${e}`);
    }
  }

  async getNextJob() {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM print_jobs_table
         WHERE status = 'pending' OR status = 'retrying'
         ORDER BY priority ASC, created_at ASC
         LIMIT 1`,
      );
      return row ? mapPrintJob(row) : null;
    } catch (e) {
      throw new Error(`PrintJobsRepository.getNextJob: ${e}`);
    }
  }

  async getJobCounts() {
    try {
      const rows = await this.db.select(
        `SELECT status, COUNT(*) AS count FROM print_jobs_table GROUP BY status`,
      );
      const counts = {};
      for (const row of rows) {
        counts[row.status] = row.count;
      }
      return counts;
    } catch (e) {
      return {};
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  async updateStatus(uuid, status, { errorMessage, processedAt, completedAt } = {}) {
    try {
      const result = await this.db.execute(
        `UPDATE print_jobs_table SET status=?, error_message=?, processed_at=?, completed_at=? WHERE uuid=?`,
        [status, errorMessage ?? null, processedAt ?? null, completedAt ?? null, uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.updateStatus: ${e}`);
    }
  }

  async markAsProcessing(uuid) {
    return this.updateStatus(uuid, 'processing', { processedAt: new Date().toISOString() });
  }

  async markAsCompleted(uuid) {
    return this.updateStatus(uuid, 'completed', { completedAt: new Date().toISOString() });
  }

  async markAsFailed(uuid, errorMessage) {
    return this.updateStatus(uuid, 'failed', { errorMessage, completedAt: new Date().toISOString() });
  }

  async markForRetry(uuid, errorMessage) {
    try {
      const job = await this.getJobByUuid(uuid);
      if (!job) return false;
      const newRetryCount = job.retry_count + 1;
      const newStatus = newRetryCount >= job.max_retries ? 'failed' : 'retrying';
      const result = await this.db.execute(
        `UPDATE print_jobs_table SET status=?, retry_count=?, error_message=?, completed_at=? WHERE uuid=?`,
        [
          newStatus, newRetryCount, errorMessage,
          newStatus === 'failed' ? new Date().toISOString() : null,
          uuid,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.markForRetry: ${e}`);
    }
  }

  async cancelJob(uuid) {
    try {
      const result = await this.db.execute(
        `UPDATE print_jobs_table SET status='cancelled', completed_at=? WHERE uuid=?`,
        [new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.cancelJob: ${e}`);
    }
  }

  async cancelJobsByOrder(orderUuid) {
    try {
      const result = await this.db.execute(
        `UPDATE print_jobs_table SET status='cancelled', completed_at=?
         WHERE order_uuid=? AND (status='pending' OR status='retrying')`,
        [new Date().toISOString(), orderUuid],
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.cancelJobsByOrder: ${e}`);
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────

  async deleteJob(uuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM print_jobs_table WHERE uuid = ?`, [uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.deleteJob: ${e}`);
    }
  }

  async deleteOldCompletedJobs(olderThanMs) {
    try {
      const cutoff = new Date(Date.now() - olderThanMs).toISOString();
      const result = await this.db.execute(
        `DELETE FROM print_jobs_table
         WHERE (status='completed' OR status='cancelled' OR status='failed')
           AND completed_at < ?`,
        [cutoff],
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.deleteOldCompleted: ${e}`);
    }
  }

  async deleteJobsByOrder(orderUuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM print_jobs_table WHERE order_uuid = ?`, [orderUuid],
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`PrintJobsRepository.deleteJobsByOrder: ${e}`);
    }
  }

  // ── STATS ─────────────────────────────────────────────────────────────────

  async getStats() {
    try {
      const counts = await this.getJobCounts();
      const rows = await this.db.select(`SELECT * FROM print_jobs_table`);
      const total = rows.length;
      const completed = rows.filter(r => r.status === 'completed');

      let averageProcessingTime = null;
      const durations = completed
        .filter(r => r.processed_at && r.completed_at)
        .map(r => new Date(r.completed_at).getTime() - new Date(r.processed_at).getTime());
      if (durations.length) {
        averageProcessingTime = durations.reduce((a, b) => a + b, 0) / durations.length;
      }

      return {
        totalJobs: total,
        pendingJobs: counts.pending ?? 0,
        processingJobs: counts.processing ?? 0,
        completedJobs: counts.completed ?? 0,
        failedJobs: counts.failed ?? 0,
        cancelledJobs: counts.cancelled ?? 0,
        retryingJobs: counts.retrying ?? 0,
        averageProcessingTimeMs: averageProcessingTime,
        get successRate() { return total > 0 ? (counts.completed ?? 0) / total : 0; },
        get activeJobs() { return (counts.pending ?? 0) + (counts.processing ?? 0) + (counts.retrying ?? 0); },
      };
    } catch (e) {
      throw new Error(`PrintJobsRepository.getStats: ${e}`);
    }
  }
}

function mapPrintJob(row) {
  return {
    ...row,
    payload: row.payload ? JSON.parse(row.payload) : {},
    products: row.products ? JSON.parse(row.products) : null,
  };
}

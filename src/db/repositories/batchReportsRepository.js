export class BatchReportsRepository {
  constructor(db) {
    this.db = db;
  }

  async createBatchReport(model) {
    return this.db.execute(
      `INSERT INTO batch_reports_table
        (uuid, batch_name, start_date, status, location_id, terminal_id,
         category_breakdown, product_breakdown, payment_method_breakdown,
         service_type_breakdown, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        model.uuid ?? '', model.batch_name ?? '',
        model.start_date ?? new Date().toISOString(),
        model.status ?? 'ACTIVE', model.location_id ?? null,
        model.terminal_id ?? null,
        model.category_breakdown ? JSON.stringify(model.category_breakdown) : null,
        model.product_breakdown ? JSON.stringify(model.product_breakdown) : null,
        model.payment_method_breakdown ? JSON.stringify(model.payment_method_breakdown) : null,
        model.service_type_breakdown ? JSON.stringify(model.service_type_breakdown) : null,
        new Date().toISOString(), new Date().toISOString(),
      ],
    );
  }

  async getActiveBatchReport({ locationId } = {}) {
    let sql = `SELECT * FROM batch_reports_table WHERE status = 'ACTIVE'`;
    const params = [];
    if (locationId != null) {
      sql += ` AND location_id = ?`;
      params.push(locationId);
    }
    const rows = await this.db.select(sql, params);
    if (!rows.length) return null;
    if (rows.length > 1) {
      console.warn('[Warning] Multiple active batch reports found for location:', locationId);
    }
    return mapBatchReport(rows[0]);
  }

  async closeBatchReport(uuid, {
    totalSales, totalCost, grossProfit, netProfit, totalOrders, totalItemsSold,
    categoryBreakdown, productBreakdown, paymentMethodBreakdown, serviceTypeBreakdown,
  } = {}) {
    const now = new Date().toISOString();
    const result = await this.db.execute(
      `UPDATE batch_reports_table SET
        status = 'CLOSED', end_date = ?, closed_at = ?,
        total_sales = ?, total_cost = ?, gross_profit = ?, net_profit = ?,
        total_orders = ?, total_items_sold = ?,
        category_breakdown = ?, product_breakdown = ?,
        payment_method_breakdown = ?, service_type_breakdown = ?,
        updated_at = ?
       WHERE uuid = ?`,
      [
        now, now,
        totalSales ?? 0, totalCost ?? 0, grossProfit ?? 0, netProfit ?? 0,
        totalOrders ?? 0, totalItemsSold ?? 0,
        categoryBreakdown ? JSON.stringify(categoryBreakdown) : null,
        productBreakdown ? JSON.stringify(productBreakdown) : null,
        paymentMethodBreakdown ? JSON.stringify(paymentMethodBreakdown) : null,
        serviceTypeBreakdown ? JSON.stringify(serviceTypeBreakdown) : null,
        now, uuid,
      ],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }

  async getBatchReportsByDateRange({ startDate, endDate, locationId } = {}) {
    let sql = `SELECT * FROM batch_reports_table
               WHERE start_date >= ? AND start_date <= ?
               ORDER BY start_date DESC`;
    const params = [
      startDate instanceof Date ? startDate.toISOString() : startDate,
      endDate instanceof Date ? endDate.toISOString() : endDate,
    ];
    if (locationId != null) {
      sql = `SELECT * FROM batch_reports_table
             WHERE start_date >= ? AND start_date <= ? AND location_id = ?
             ORDER BY start_date DESC`;
      params.push(locationId);
    }
    const rows = await this.db.select(sql, params);
    return rows.map(mapBatchReport);
  }

  async getBatchReportByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM batch_reports_table WHERE uuid = ? LIMIT 1`, [uuid],
    );
    return row ? mapBatchReport(row) : null;
  }

  watchActiveBatchReport({ locationId } = {}, callback) {
    const run = async () => {
      const result = await this.getActiveBatchReport({ locationId });
      callback(result);
    };
    run();
    return this.db.subscribe?.('batch_reports_table', run) ?? (() => {});
  }

  async updateBatchReportStats(uuid, {
    totalSales, totalCost, grossProfit, netProfit, totalOrders, totalItemsSold,
  }) {
    const result = await this.db.execute(
      `UPDATE batch_reports_table SET
        total_sales = ?, total_cost = ?, gross_profit = ?, net_profit = ?,
        total_orders = ?, total_items_sold = ?, updated_at = ?
       WHERE uuid = ?`,
      [
        totalSales, totalCost, grossProfit, netProfit, totalOrders, totalItemsSold,
        new Date().toISOString(), uuid,
      ],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }
}

function mapBatchReport(row) {
  return {
    ...row,
    category_breakdown: row.category_breakdown ? JSON.parse(row.category_breakdown) : null,
    product_breakdown: row.product_breakdown ? JSON.parse(row.product_breakdown) : null,
    payment_method_breakdown: row.payment_method_breakdown ? JSON.parse(row.payment_method_breakdown) : null,
    service_type_breakdown: row.service_type_breakdown ? JSON.parse(row.service_type_breakdown) : null,
  };
}

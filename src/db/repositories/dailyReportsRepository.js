export class DailyReportsRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateDailyReport(model) {
    return this.db.execute(
      `INSERT OR REPLACE INTO daily_reports_table
        (uuid, report_date, total_sales, total_cost, gross_profit, net_profit,
         total_orders, total_items_sold, average_order_value,
         best_selling_product_uuid, best_selling_category_uuid,
         hourly_breakdown, payment_methods, service_types, location_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        model.uuid ?? '', model.report_date ?? '',
        model.total_sales ?? 0, model.total_cost ?? 0,
        model.gross_profit ?? 0, model.net_profit ?? 0,
        model.total_orders ?? 0, model.total_items_sold ?? 0,
        model.average_order_value ?? 0,
        model.best_selling_product_uuid ?? null,
        model.best_selling_category_uuid ?? null,
        model.hourly_breakdown ? JSON.stringify(model.hourly_breakdown) : null,
        model.payment_methods ? JSON.stringify(model.payment_methods) : null,
        model.service_types ? JSON.stringify(model.service_types) : null,
        model.location_id ?? null, model.created_at ?? null,
      ],
    );
  }

  async getDailyReportByDate(date, { locationId } = {}) {
    let sql = `SELECT * FROM daily_reports_table WHERE report_date = ?`;
    const params = [date];
    if (locationId != null) {
      sql += ` AND location_id = ?`;
      params.push(locationId);
    }
    const [row] = await this.db.select(sql, params);
    return row ? mapDailyReport(row) : null;
  }

  async getDailyReportsByDateRange({ startDate, endDate, locationId } = {}) {
    let sql = `SELECT * FROM daily_reports_table
               WHERE report_date >= ? AND report_date <= ?
               ORDER BY report_date DESC`;
    const params = [startDate, endDate];
    if (locationId != null) {
      sql = `SELECT * FROM daily_reports_table
             WHERE report_date >= ? AND report_date <= ? AND location_id = ?
             ORDER BY report_date DESC`;
      params.push(locationId);
    }
    const rows = await this.db.select(sql, params);
    return rows.map(mapDailyReport);
  }

  watchDailyReportByDate(date, { locationId } = {}, callback) {
    const run = async () => {
      const result = await this.getDailyReportByDate(date, { locationId });
      callback(result);
    };
    run();
    return this.db.subscribe?.('daily_reports_table', run) ?? (() => {});
  }
}

function mapDailyReport(row) {
  return {
    ...row,
    hourly_breakdown: row.hourly_breakdown ? JSON.parse(row.hourly_breakdown) : null,
    payment_methods: row.payment_methods ? JSON.parse(row.payment_methods) : null,
    service_types: row.service_types ? JSON.parse(row.service_types) : null,
  };
}

export class ExtOrdersRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllOrders({ limit, offset, lastThreeDaysOnly = false } = {}) {
    let sql = `SELECT * FROM ext_orders_table`;
    const params = [];
    if (lastThreeDaysOnly) {
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      sql += ` WHERE (created_at >= ? OR updated_at >= ?)`;
      params.push(cutoff, cutoff);
    }
    if (limit != null) {
      sql += ` LIMIT ?`;
      params.push(limit);
      if (offset != null) { sql += ` OFFSET ?`; params.push(offset); }
    }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  async getTotalOrdersCount({ lastThreeDaysOnly = false } = {}) {
    let sql = `SELECT COUNT(*) AS count FROM ext_orders_table`;
    const params = [];
    if (lastThreeDaysOnly) {
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      sql += ` WHERE (created_at >= ? OR updated_at >= ?)`;
      params.push(cutoff, cutoff);
    }
    const [row] = await this.db.select(sql, params);
    return row?.count ?? 0;
  }

  async getOrderById(id) {
    const [row] = await this.db.select(
      `SELECT * FROM ext_orders_table WHERE id = ? LIMIT 1`, [id],
    );
    return row ? mapExtOrder(row) : null;
  }

  async getOrderByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM ext_orders_table WHERE uuid = ? LIMIT 1`, [uuid],
    );
    return row ? mapExtOrder(row) : null;
  }

  async getOrdersByStatus(status, { limit } = {}) {
    let sql = `SELECT * FROM ext_orders_table WHERE last_status = ?`;
    const params = [status];
    if (limit != null) { sql += ` LIMIT ?`; params.push(limit); }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  async getOrdersByCountry(country, { limit } = {}) {
    let sql = `SELECT * FROM ext_orders_table WHERE country = ?`;
    const params = [country];
    if (limit != null) { sql += ` LIMIT ?`; params.push(limit); }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  async getOrdersByMode(mode, { limit } = {}) {
    let sql = `SELECT * FROM ext_orders_table WHERE mode = ?`;
    const params = [mode];
    if (limit != null) { sql += ` LIMIT ?`; params.push(limit); }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  async getActiveOrders({ limit } = {}) {
    let sql = `SELECT * FROM ext_orders_table
               WHERE deleted_at IS NULL AND (last_status = 'ACTIVATED' OR last_status = 'in_progress')`;
    const params = [];
    if (limit != null) { sql += ` LIMIT ?`; params.push(limit); }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  async getActiveOrdersCount() {
    const [row] = await this.db.select(
      `SELECT COUNT(*) AS count FROM ext_orders_table
       WHERE deleted_at IS NULL AND (last_status = 'ACTIVATED' OR last_status = 'in_progress')`,
    );
    return row?.count ?? 0;
  }

  async getDeletedOrders({ limit } = {}) {
    let sql = `SELECT * FROM ext_orders_table WHERE deleted_at IS NOT NULL`;
    const params = [];
    if (limit != null) { sql += ` LIMIT ?`; params.push(limit); }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  watchAllOrders(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM ext_orders_table`);
      callback(rows.map(mapExtOrder));
    };
    run();
    return this.db.subscribe?.('ext_orders_table', run) ?? (() => {});
  }

  watchOrderById(id, callback) {
    const run = async () => {
      const result = await this.getOrderById(id);
      callback(result);
    };
    run();
    return this.db.subscribe?.('ext_orders_table', run) ?? (() => {});
  }

  watchOrdersByCustomer(customerUuid, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM ext_orders_table WHERE customer_uuid = ?`, [customerUuid],
      );
      callback(rows.map(mapExtOrder));
    };
    run();
    return this.db.subscribe?.('ext_orders_table', run) ?? (() => {});
  }

  watchOrdersByStatus(status, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM ext_orders_table WHERE last_status = ?`, [status],
      );
      callback(rows.map(mapExtOrder));
    };
    run();
    return this.db.subscribe?.('ext_orders_table', run) ?? (() => {});
  }

  async insertOrder(model) {
    return this.db.execute(
      `INSERT INTO ext_orders_table
        (uuid, id, local_id, supabase_id, microservice_id, service_type,
         created_at, updated_at, version, synced_at, deleted_at, mode, country,
         order_number, customer_uuid, last_status, status_stages,
         ticket_status_stages, discount, products, payments,
         terminal_id, sale_channel_type, location_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        model.uuid ?? '', model.id ?? null, model.local_id ?? null,
        model.supabase_id ?? null, model.microservice_id ?? null,
        model.service_type ?? null,
        model.created_at ?? new Date().toISOString(),
        model.updated_at ?? new Date().toISOString(),
        model.version ?? null, model.synced_at ?? null, model.deleted_at ?? null,
        model.mode ?? null, model.country ?? null,
        model.order_number ?? 0, model.customer_uuid ?? null,
        model.last_status ?? '',
        model.status_stages ? JSON.stringify(model.status_stages) : null,
        model.ticket_status_stages ? JSON.stringify(model.ticket_status_stages) : null,
        model.discount ?? null,
        model.products ? JSON.stringify(model.products) : null,
        model.payments ? JSON.stringify(model.payments) : null,
        model.terminal_id ?? null, model.sale_channel_type ?? null,
        model.location_id ?? null,
      ],
    );
  }

  async updateOrder(model) {
    if (model.id == null) return false;
    const result = await this.db.execute(
      `UPDATE ext_orders_table SET
        products=?, customer_uuid=?, last_status=?, updated_at=?,
        service_type=?, mode=?, country=?, order_number=?, terminal_id=?,
        sale_channel_type=?, location_id=?, ticket_status_stages=?,
        local_id=?, payments=?, discount=?, microservice_id=?, supabase_id=?,
        status_stages=?
       WHERE id = ?`,
      [
        model.products ? JSON.stringify(model.products) : null,
        model.customer_uuid ?? null, model.last_status ?? null,
        new Date().toISOString(), model.service_type ?? null, model.mode ?? null,
        model.country ?? null, model.order_number ?? null, model.terminal_id ?? null,
        model.sale_channel_type ?? null, model.location_id ?? null,
        model.ticket_status_stages ? JSON.stringify(model.ticket_status_stages) : null,
        model.local_id ?? null,
        model.payments ? JSON.stringify(model.payments) : null,
        model.discount ?? null, model.microservice_id ?? null,
        model.supabase_id ?? null,
        model.status_stages ? JSON.stringify(model.status_stages) : null,
        model.id,
      ],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }

  async updateOrderByUUID(updatedModel, uuid) {
    try {
      const result = await this.db.execute(
        `UPDATE ext_orders_table SET
          products=?, customer_uuid=?, last_status=?, updated_at=?,
          service_type=?, mode=?, country=?, order_number=?, terminal_id=?,
          sale_channel_type=?, location_id=?, ticket_status_stages=?,
          local_id=?, payments=?, discount=?, microservice_id=?, supabase_id=?,
          status_stages=?
         WHERE uuid = ?`,
        [
          updatedModel.products ? JSON.stringify(updatedModel.products) : null,
          updatedModel.customer_uuid ?? null, updatedModel.last_status ?? null,
          new Date().toISOString(), updatedModel.service_type ?? null,
          updatedModel.mode ?? null, updatedModel.country ?? null,
          updatedModel.order_number ?? null, updatedModel.terminal_id ?? null,
          updatedModel.sale_channel_type ?? null, updatedModel.location_id ?? null,
          updatedModel.ticket_status_stages ? JSON.stringify(updatedModel.ticket_status_stages) : null,
          updatedModel.local_id ?? null,
          updatedModel.payments ? JSON.stringify(updatedModel.payments) : null,
          updatedModel.discount ?? null, updatedModel.microservice_id ?? null,
          updatedModel.supabase_id ?? null,
          updatedModel.status_stages ? JSON.stringify(updatedModel.status_stages) : null,
          uuid,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      return false;
    }
  }

  async upsertOrder(model) {
    const m = { ...model, updated_at: new Date().toISOString() };
    return this.db.execute(
      `INSERT OR REPLACE INTO ext_orders_table
        (uuid, id, local_id, supabase_id, microservice_id, service_type,
         created_at, updated_at, version, synced_at, deleted_at, mode, country,
         order_number, customer_uuid, last_status, status_stages,
         ticket_status_stages, discount, products, payments,
         terminal_id, sale_channel_type, location_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        m.uuid ?? '', m.id ?? null, m.local_id ?? null, m.supabase_id ?? null,
        m.microservice_id ?? null, m.service_type ?? null,
        m.created_at ?? null, m.updated_at,
        m.version ?? null, m.synced_at ?? null, m.deleted_at ?? null,
        m.mode ?? null, m.country ?? null, m.order_number ?? 0,
        m.customer_uuid ?? null, m.last_status ?? '',
        m.status_stages ? JSON.stringify(m.status_stages) : null,
        m.ticket_status_stages ? JSON.stringify(m.ticket_status_stages) : null,
        m.discount ?? null,
        m.products ? JSON.stringify(m.products) : null,
        m.payments ? JSON.stringify(m.payments) : null,
        m.terminal_id ?? null, m.sale_channel_type ?? null, m.location_id ?? null,
      ],
    );
  }

  async deleteOrderByUuid(uuid) {
    const result = await this.db.execute(
      `DELETE FROM ext_orders_table WHERE uuid = ?`, [uuid],
    );
    return result?.rowsAffected ?? 0;
  }

  async softDeleteOrder(id) {
    const result = await this.db.execute(
      `UPDATE ext_orders_table SET deleted_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
    return result?.rowsAffected ?? 0;
  }

  async deleteOrder(id) {
    const result = await this.db.execute(
      `DELETE FROM ext_orders_table WHERE id = ?`, [id],
    );
    return result?.rowsAffected ?? 0;
  }

  async searchOrders({ id, uuid, orderNumber, customerUuid, status, country, mode, limit } = {}) {
    const wheres = [];
    const params = [];
    if (id != null) { wheres.push('id = ?'); params.push(id); }
    if (uuid != null) { wheres.push('uuid = ?'); params.push(uuid); }
    if (orderNumber != null) { wheres.push('order_number = ?'); params.push(orderNumber); }
    if (customerUuid != null) { wheres.push('customer_uuid = ?'); params.push(customerUuid); }
    if (status != null) { wheres.push('last_status = ?'); params.push(status); }
    if (country != null) { wheres.push('country = ?'); params.push(country); }
    if (mode != null) { wheres.push('mode = ?'); params.push(mode); }

    let sql = `SELECT * FROM ext_orders_table`;
    if (wheres.length) sql += ` WHERE ${wheres.join(' AND ')}`;
    if (limit != null) { sql += ` LIMIT ?`; params.push(limit); }
    const rows = await this.db.select(sql, params);
    return rows.map(mapExtOrder);
  }

  async countAllOrders() {
    const [row] = await this.db.select(`SELECT COUNT(*) AS count FROM ext_orders_table`);
    return row?.count ?? 0;
  }

  async countOrdersByStatus(status) {
    const [row] = await this.db.select(
      `SELECT COUNT(*) AS count FROM ext_orders_table WHERE last_status = ?`, [status],
    );
    return row?.count ?? 0;
  }

  async createOrUpdateAll(orders) {
    for (const o of orders) {
      await this.upsertOrder(o);
    }
  }
}

function mapExtOrder(row) {
  return {
    ...row,
    status_stages: row.status_stages ? JSON.parse(row.status_stages) : [],
    ticket_status_stages: row.ticket_status_stages ? JSON.parse(row.ticket_status_stages) : [],
    products: row.products ? JSON.parse(row.products) : null,
    payments: row.payments ? JSON.parse(row.payments) : [],
  };
}

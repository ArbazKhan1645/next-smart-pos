export class CustomersRepository {
  constructor(db) {
    this.db = db;
  }

  async createOrUpdateAll(customers) {
    for (const c of customers) {
      await this.db.execute(
        `INSERT OR REPLACE INTO customers_table
          (uuid, id, first_name, last_name, email, phone, building_number, street,
           city, zip_or_postal_code, country_id, location_id, customer_type_id,
           custom_tier_uuid, is_default, created_at, updated_at, version, deleted_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          c.uuid, c.id ?? null, c.first_name ?? null, c.last_name ?? null,
          c.email ?? null, c.phone ?? null, c.building_number ?? null,
          c.street ?? null, c.city ?? null, c.zip_or_postal_code ?? null,
          c.country_id ?? null, c.location_id ?? null, c.customer_type_id ?? null,
          c.custom_tier_uuid ?? null,
          c.is_default != null ? (c.is_default ? 1 : 0) : null,
          c.created_at ?? null, c.updated_at ?? null, c.version ?? null,
          c.deleted_at ?? null,
        ],
      );
    }
  }

  async getCustomerById(uuid) {
    const [row] = await this.db.select(
      `SELECT * FROM customers_table WHERE uuid = ?`, [uuid],
    );
    return row ? mapCustomer(row) : null;
  }

  async getAllCustomers() {
    const rows = await this.db.select(`SELECT * FROM customers_table`);
    return rows.map(mapCustomer);
  }

  async deleteCustomerById(uuid) {
    const result = await this.db.execute(
      `DELETE FROM customers_table WHERE uuid = ?`, [uuid],
    );
    return (result?.rowsAffected ?? 0) > 0;
  }
}

function mapCustomer(row) {
  return {
    ...row,
    is_default: row.is_default === 1,
  };
}

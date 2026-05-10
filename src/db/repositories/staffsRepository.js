export class StaffsRepository {
  constructor(db) {
    this.db = db;
  }

  async createStaff(staff) {
    try {
      return await this.db.execute(
        `INSERT INTO staffs_table
          (uuid, id, first_name, last_name, email, phone, pin, merchant_id,
           location_id, is_active, role_id, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          staff.uuid, staff.id ?? null, staff.first_name ?? null,
          staff.last_name ?? null, staff.email ?? null, staff.phone ?? null,
          staff.pin ?? null, staff.merchant_id ?? null, staff.location_id ?? null,
          staff.is_active != null ? (staff.is_active ? 1 : 0) : null,
          staff.role_id ?? null, staff.created_at ?? null,
          staff.updated_at ?? null, staff.version ?? null,
        ],
      );
    } catch (e) {
      console.error('createStaff error:', e);
      return -1;
    }
  }

  async createOrUpdateAll(staffs) {
    try {
      for (const s of staffs) {
        await this.db.execute(
          `INSERT OR REPLACE INTO staffs_table
            (uuid, id, first_name, last_name, email, phone, pin, merchant_id,
             location_id, is_active, role_id, created_at, updated_at, version)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            s.uuid, s.id ?? null, s.first_name ?? null, s.last_name ?? null,
            s.email ?? null, s.phone ?? null, s.pin ?? null,
            s.merchant_id ?? null, s.location_id ?? null,
            s.is_active != null ? (s.is_active ? 1 : 0) : null,
            s.role_id ?? null, s.created_at ?? null,
            s.updated_at ?? null, s.version ?? null,
          ],
        );
      }
    } catch (e) {
      console.error('createOrUpdateAll staffs error:', e);
      return -99999;
    }
  }

  watchAllStaffs(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM staffs_table`);
      callback(rows.map(mapStaff));
    };
    run();
    return this.db.subscribe?.('staffs_table', run) ?? (() => {});
  }

  async getAllStaffs() {
    try {
      const rows = await this.db.select(`SELECT * FROM staffs_table`);
      return rows.map(mapStaff);
    } catch (e) {
      return [];
    }
  }

  async getStaffByUuid(uuid) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM staffs_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      return row ? mapStaff(row) : null;
    } catch (e) {
      return null;
    }
  }

  async getStaffByFilter({ merchantId, locationId, pin }) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM staffs_table WHERE merchant_id = ? AND location_id = ? AND pin = ? LIMIT 1`,
        [merchantId, locationId, pin],
      );
      return row ? mapStaff(row) : null;
    } catch (e) {
      return null;
    }
  }

  async getStaffCount() {
    try {
      const [row] = await this.db.select(
        `SELECT COUNT(*) AS count FROM staffs_table`,
      );
      return row?.count ?? 0;
    } catch (e) {
      return -1;
    }
  }

  async getStaffsByMerchant(merchantId) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM staffs_table WHERE merchant_id = ?`, [merchantId],
      );
      return rows.map(mapStaff);
    } catch (e) {
      return [];
    }
  }

  async getActiveStaffs() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM staffs_table WHERE is_active = 1`,
      );
      return rows.map(mapStaff);
    } catch (e) {
      return [];
    }
  }

  async updateStaff(staff) {
    try {
      const result = await this.db.execute(
        `UPDATE staffs_table SET first_name=?, last_name=?, email=?, phone=?,
          pin=?, merchant_id=?, location_id=?, is_active=?, role_id=?, updated_at=?
         WHERE uuid = ?`,
        [
          staff.first_name ?? null, staff.last_name ?? null,
          staff.email ?? null, staff.phone ?? null, staff.pin ?? null,
          staff.merchant_id ?? null, staff.location_id ?? null,
          staff.is_active != null ? (staff.is_active ? 1 : 0) : null,
          staff.role_id ?? null, staff.updated_at ?? null,
          staff.uuid,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      return false;
    }
  }

  async updateStaffActiveStatus(uuid, isActive) {
    try {
      const result = await this.db.execute(
        `UPDATE staffs_table SET is_active = ? WHERE uuid = ?`,
        [isActive ? 1 : 0, uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async updateStaffPin(uuid, newPin) {
    try {
      const result = await this.db.execute(
        `UPDATE staffs_table SET pin = ? WHERE uuid = ?`, [newPin, uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async deleteStaff(uuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM staffs_table WHERE uuid = ?`, [uuid],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async deleteAllStaffs() {
    try {
      const result = await this.db.execute(`DELETE FROM staffs_table`);
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }

  async deleteStaffsByMerchant(merchantId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM staffs_table WHERE merchant_id = ?`, [merchantId],
      );
      return result?.rowsAffected ?? -1;
    } catch (e) {
      return -1;
    }
  }
}

function mapStaff(row) {
  return {
    ...row,
    is_active: row.is_active === 1,
  };
}

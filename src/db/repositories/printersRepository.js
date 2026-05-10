export class PrintersRepository {
  constructor(db) {
    this.db = db;
  }

  // ── CREATE ────────────────────────────────────────────────────────────────

  async insertPrinter(printer) {
    try {
      return await this.db.execute(
        `INSERT INTO printers_table
          (uuid, name, description, printer_type, hardware_name, hardware_type,
           receipt_template, is_enabled, is_default, paper_width, auto_cut,
           open_drawer, copies, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          printer.uuid, printer.name ?? null, printer.description ?? null,
          printer.printerType ?? null, printer.hardwareName ?? null,
          printer.hardwareType ?? null, printer.receiptTemplate ?? null,
          printer.isEnabled != null ? (printer.isEnabled ? 1 : 0) : 1,
          printer.isDefault != null ? (printer.isDefault ? 1 : 0) : 0,
          printer.paperWidth ?? null,
          printer.autoCut != null ? (printer.autoCut ? 1 : 0) : 1,
          printer.openDrawer != null ? (printer.openDrawer ? 1 : 0) : 0,
          printer.copies ?? 1,
          printer.createdAt ?? new Date().toISOString(),
          printer.updatedAt ?? new Date().toISOString(),
        ],
      );
    } catch (e) {
      throw new Error(`PrintersRepository.insertPrinter: ${e}`);
    }
  }

  async upsertPrinter(printer) {
    try {
      return await this.db.execute(
        `INSERT OR REPLACE INTO printers_table
          (uuid, name, description, printer_type, hardware_name, hardware_type,
           receipt_template, is_enabled, is_default, paper_width, auto_cut,
           open_drawer, copies, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          printer.uuid, printer.name ?? null, printer.description ?? null,
          printer.printerType ?? null, printer.hardwareName ?? null,
          printer.hardwareType ?? null, printer.receiptTemplate ?? null,
          printer.isEnabled != null ? (printer.isEnabled ? 1 : 0) : 1,
          printer.isDefault != null ? (printer.isDefault ? 1 : 0) : 0,
          printer.paperWidth ?? null,
          printer.autoCut != null ? (printer.autoCut ? 1 : 0) : 1,
          printer.openDrawer != null ? (printer.openDrawer ? 1 : 0) : 0,
          printer.copies ?? 1,
          printer.createdAt ?? new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
    } catch (e) {
      throw new Error(`PrintersRepository.upsertPrinter: ${e}`);
    }
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  async getAllPrinters() {
    try {
      const rows = await this.db.select(`SELECT * FROM printers_table`);
      return rows.map(mapPrinter);
    } catch (e) {
      throw new Error(`PrintersRepository.getAllPrinters: ${e}`);
    }
  }

  watchAllPrinters(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM printers_table`);
      callback(rows.map(mapPrinter));
    };
    run();
    return this.db.subscribe?.('printers_table', run) ?? (() => {});
  }

  async getPrinterById(id) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM printers_table WHERE id = ? LIMIT 1`, [id],
      );
      return row ? mapPrinter(row) : null;
    } catch (e) {
      throw new Error(`PrintersRepository.getPrinterById: ${e}`);
    }
  }

  async getPrinterByUuid(uuid) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM printers_table WHERE uuid = ? LIMIT 1`, [uuid],
      );
      return row ? mapPrinter(row) : null;
    } catch (e) {
      throw new Error(`PrintersRepository.getPrinterByUuid: ${e}`);
    }
  }

  async getPrintersByType(printerType) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM printers_table WHERE printer_type = ?`, [printerType],
      );
      return rows.map(mapPrinter);
    } catch (e) {
      throw new Error(`PrintersRepository.getPrintersByType: ${e}`);
    }
  }

  watchPrintersByType(printerType, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM printers_table WHERE printer_type = ?`, [printerType],
      );
      callback(rows.map(mapPrinter));
    };
    run();
    return this.db.subscribe?.('printers_table', run) ?? (() => {});
  }

  async getEnabledPrinters() {
    try {
      const rows = await this.db.select(
        `SELECT * FROM printers_table WHERE is_enabled = 1`,
      );
      return rows.map(mapPrinter);
    } catch (e) {
      throw new Error(`PrintersRepository.getEnabledPrinters: ${e}`);
    }
  }

  async getDefaultPrinter(printerType) {
    try {
      const [row] = await this.db.select(
        `SELECT * FROM printers_table WHERE printer_type = ? AND is_default = 1 AND is_enabled = 1 LIMIT 1`,
        [printerType],
      );
      return row ? mapPrinter(row) : null;
    } catch (e) {
      throw new Error(`PrintersRepository.getDefaultPrinter: ${e}`);
    }
  }

  async getPrintersByHardware(hardwareName) {
    try {
      const rows = await this.db.select(
        `SELECT * FROM printers_table WHERE hardware_name = ?`, [hardwareName],
      );
      return rows.map(mapPrinter);
    } catch (e) {
      throw new Error(`PrintersRepository.getPrintersByHardware: ${e}`);
    }
  }

  async printerExistsByName(name) {
    const rows = await this.db.select(
      `SELECT 1 FROM printers_table WHERE name = ? LIMIT 1`, [name],
    );
    return rows.length > 0;
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  async updatePrinter(printer) {
    try {
      const result = await this.db.execute(
        `UPDATE printers_table SET name=?, description=?, printer_type=?,
          hardware_name=?, hardware_type=?, receipt_template=?, is_enabled=?,
          is_default=?, paper_width=?, auto_cut=?, open_drawer=?, copies=?,
          updated_at=?
         WHERE uuid = ?`,
        [
          printer.name ?? null, printer.description ?? null,
          printer.printerType ?? null, printer.hardwareName ?? null,
          printer.hardwareType ?? null, printer.receiptTemplate ?? null,
          printer.isEnabled != null ? (printer.isEnabled ? 1 : 0) : 1,
          printer.isDefault != null ? (printer.isDefault ? 1 : 0) : 0,
          printer.paperWidth ?? null,
          printer.autoCut != null ? (printer.autoCut ? 1 : 0) : 1,
          printer.openDrawer != null ? (printer.openDrawer ? 1 : 0) : 0,
          printer.copies ?? 1, new Date().toISOString(), printer.uuid,
        ],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintersRepository.updatePrinter: ${e}`);
    }
  }

  async setEnabled(uuid, enabled) {
    try {
      const result = await this.db.execute(
        `UPDATE printers_table SET is_enabled = ?, updated_at = ? WHERE uuid = ?`,
        [enabled ? 1 : 0, new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintersRepository.setEnabled: ${e}`);
    }
  }

  async setAsDefault(uuid) {
    try {
      const printer = await this.getPrinterByUuid(uuid);
      if (!printer) return false;
      await this.db.execute(
        `UPDATE printers_table SET is_default = 0, updated_at = ? WHERE printer_type = ?`,
        [new Date().toISOString(), printer.printerType],
      );
      const result = await this.db.execute(
        `UPDATE printers_table SET is_default = 1, updated_at = ? WHERE uuid = ?`,
        [new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintersRepository.setAsDefault: ${e}`);
    }
  }

  async updateHardwareMapping(uuid, hardwareName, hardwareType) {
    try {
      const result = await this.db.execute(
        `UPDATE printers_table SET hardware_name=?, hardware_type=?, updated_at=? WHERE uuid=?`,
        [hardwareName, hardwareType, new Date().toISOString(), uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintersRepository.updateHardwareMapping: ${e}`);
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────

  async deletePrinter(uuid) {
    try {
      const result = await this.db.execute(
        `DELETE FROM printers_table WHERE uuid = ?`, [uuid],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintersRepository.deletePrinter: ${e}`);
    }
  }

  async deletePrinterById(id) {
    try {
      const result = await this.db.execute(
        `DELETE FROM printers_table WHERE id = ?`, [id],
      );
      return (result?.rowsAffected ?? 0) > 0;
    } catch (e) {
      throw new Error(`PrintersRepository.deletePrinterById: ${e}`);
    }
  }

  async deletePrintersByType(printerType) {
    try {
      const result = await this.db.execute(
        `DELETE FROM printers_table WHERE printer_type = ?`, [printerType],
      );
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`PrintersRepository.deletePrintersByType: ${e}`);
    }
  }

  async deleteAllPrinters() {
    try {
      const result = await this.db.execute(`DELETE FROM printers_table`);
      return result?.rowsAffected ?? 0;
    } catch (e) {
      throw new Error(`PrintersRepository.deleteAllPrinters: ${e}`);
    }
  }

  // ── BATCH ─────────────────────────────────────────────────────────────────

  async insertAll(printers) {
    try {
      for (const p of printers) {
        await this.upsertPrinter(p);
      }
    } catch (e) {
      throw new Error(`PrintersRepository.insertAll: ${e}`);
    }
  }

  async initializeDefaultPrinters() {
    try {
      const existing = await this.getAllPrinters();
      if (existing.length) return;
      const crypto = globalThis.crypto ?? { randomUUID: () => Math.random().toString(36).slice(2) };
      const defaults = [
        ...Array.from({ length: 2 }, (_, i) => ({
          uuid: crypto.randomUUID(), name: `Receipt ${i + 1}`, printerType: 'receipt',
          hardwareName: '', hardwareType: 'usb', isDefault: i === 0, isEnabled: true, copies: 1, autoCut: true, openDrawer: false,
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          uuid: crypto.randomUUID(), name: `Kitchen ${i + 1}`, printerType: 'kitchen',
          hardwareName: '', hardwareType: 'usb', isDefault: i === 0, isEnabled: true, copies: 1, autoCut: true, openDrawer: false,
        })),
        { uuid: crypto.randomUUID(), name: 'Invoice', printerType: 'invoice', hardwareName: '', hardwareType: 'usb', isDefault: true, isEnabled: true, copies: 1, autoCut: true, openDrawer: false },
        ...Array.from({ length: 2 }, (_, i) => ({
          uuid: crypto.randomUUID(), name: `Label ${i + 1}`, printerType: 'label',
          hardwareName: '', hardwareType: 'usb', isDefault: i === 0, isEnabled: true, copies: 1, autoCut: false, openDrawer: false,
        })),
      ];
      await this.insertAll(defaults);
    } catch (e) {
      throw new Error(`PrintersRepository.initializeDefaultPrinters: ${e}`);
    }
  }
}

function mapPrinter(row) {
  return {
    ...row,
    is_enabled: row.is_enabled === 1,
    is_default: row.is_default === 1,
    auto_cut: row.auto_cut === 1,
    open_drawer: row.open_drawer === 1,
    // camelCase aliases for convenience
    printerType: row.printer_type,
    hardwareName: row.hardware_name,
    hardwareType: row.hardware_type,
    receiptTemplate: row.receipt_template,
    isEnabled: row.is_enabled === 1,
    isDefault: row.is_default === 1,
    paperWidth: row.paper_width,
    autoCut: row.auto_cut === 1,
    openDrawer: row.open_drawer === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

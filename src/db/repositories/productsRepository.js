// Products Repository — JS clone of Flutter ProductsRepository (Drift DAO)
// All methods mirror the Flutter repo signatures exactly.
// db = the SQLite database instance (will be wired via Tauri plugin-sql or better-sqlite3)

export class ProductsRepository {
  constructor(db) {
    this.db = db;
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  /** Watch all products (returns unsubscribe fn; callback receives Product[]) */
  watchAllProducts(callback) {
    const run = () =>
      this.db.select('SELECT * FROM products_table').then(rows => {
        callback(rows.map(mapProduct));
      });
    run();
    return this.db.subscribe?.('products_table', run) ?? (() => {});
  }

  /** Get products by name (LIKE search, limit 30, ordered by name) */
  async getProductsByName(searchTerm) {
    const rows = await this.db.select(
      `SELECT * FROM products_table WHERE name LIKE ? ORDER BY name LIMIT 30`,
      [`%${searchTerm}%`],
    );
    return rows.map(mapProduct);
  }

  /** Get products by category UUID with pagination */
  async getProductsByCategoryPaginated(categoryUuid, { limit, offset = 0 }) {
    const rows = await this.db.select(
      `SELECT * FROM products_table WHERE category_uuid = ? LIMIT ? OFFSET ?`,
      [categoryUuid, limit, offset],
    );
    return rows.map(mapProduct);
  }

  /** Get total product count (all, ignoring category filter) */
  async getTotalProductsCount() {
    const [row] = await this.db.select(
      `SELECT COUNT(*) AS count FROM products_table`,
    );
    return row?.count ?? 0;
  }

  /** Get single product by barcode */
  async getProductByBarcode(barcode) {
    const [row] = await this.db.select(
      `SELECT * FROM products_table WHERE barcode = ? LIMIT 1`,
      [barcode],
    );
    return row ? mapProduct(row) : null;
  }

  /** Get all products (raw, no model mapping) */
  async getAllProducts() {
    return this.db.select(`SELECT * FROM products_table`);
  }

  /** Get all product ids as string array */
  async getAllProductIds() {
    const rows = await this.db.select(
      `SELECT id FROM products_table`,
    );
    return rows.map(r => String(r.id));
  }

  /** Get all non-deleted products that are not synced (id IS NULL) */
  async findAllUnSynced() {
    const rows = await this.db.select(
      `SELECT * FROM products_table WHERE id IS NULL AND deleted_at IS NULL`,
    );
    return rows.map(mapProduct);
  }

  /** Get all products where deleted_at IS NULL (logically active) */
  async findAllDeleted() {
    const rows = await this.db.select(
      `SELECT * FROM products_table WHERE id IS NOT NULL AND deleted_at IS NULL`,
    );
    return rows.map(mapProduct);
  }

  // ── WRITE ─────────────────────────────────────────────────────────────────

  /** Insert a single product, returns rowid or -99999 on error */
  async insertProduct(product) {
    try {
      const cols = productColumns();
      const vals = productValues(product);
      return await this.db.execute(
        `INSERT INTO products_table (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
        vals,
      );
    } catch (e) {
      console.error('insertProduct error:', e);
      return -99999;
    }
  }

  /** Upsert by uuid: delete existing then re-insert */
  async insertProduct2(product) {
    try {
      await this.db.execute(
        `DELETE FROM products_table WHERE uuid = ?`,
        [product.uuid],
      );
      return await this.insertProduct(product);
    } catch (e) {
      console.error('insertProduct2 error:', e);
      return -99999;
    }
  }

  /** Create or update a single product (checks by id) */
  async createOrUpdate(product) {
    try {
      if (product.id != null) {
        const [existing] = await this.db.select(
          `SELECT uuid FROM products_table WHERE id = ?`,
          [product.id],
        );
        if (!existing) {
          await this.insertProduct(product);
        } else {
          await this._updateByUuid(product);
        }
      } else {
        await this.insertProduct(product);
      }
      return true;
    } catch (e) {
      console.error('createOrUpdate error:', e);
      return false;
    }
  }

  /** Bulk upsert — INSERT OR REPLACE for each product */
  async createOrUpdateAll(products) {
    try {
      const cols = productColumns();
      const placeholders = `(${cols.map(() => '?').join(',')})`;
      const stmt = `INSERT OR REPLACE INTO products_table (${cols.join(',')}) VALUES ${placeholders}`;
      for (const p of products) {
        await this.db.execute(stmt, productValues(p));
      }
    } catch (e) {
      console.error('createOrUpdateAll error:', e);
      return -99999;
    }
  }

  /** Delete product by UUID, returns rows deleted */
  async deleteProductByUuid(uuid) {
    try {
      return await this.db.execute(
        `DELETE FROM products_table WHERE uuid = ?`,
        [uuid],
      );
    } catch (e) {
      console.error('deleteProductByUuid error:', e);
      return -1;
    }
  }

  /** Alias for deleteProductByUuid */
  async deleteRecord(uuid) {
    return this.deleteProductByUuid(uuid);
  }

  /** Hard delete by deleted_at being set */
  async removeAllDeleted() {
    return this.db.execute(
      `DELETE FROM products_table WHERE deleted_at IS NOT NULL`,
    );
  }

  // ── PRIVATE ───────────────────────────────────────────────────────────────

  async _updateByUuid(product) {
    const sets = productColumns()
      .filter(c => c !== 'uuid')
      .map(c => `${c} = ?`).join(', ');
    const vals = productValues(product).filter((_, i) => productColumns()[i] !== 'uuid');
    vals.push(product.uuid);
    return this.db.execute(
      `UPDATE products_table SET ${sets} WHERE uuid = ?`,
      vals,
    );
  }
}

// ── Column helpers ────────────────────────────────────────────────────────────

function productColumns() {
  return [
    'uuid', 'id', 'created_at', 'updated_at', 'deleted_at', 'version',
    'buying_price', 'selling_price', 'location_id', 'sale_channels', 'name',
    'category_uuid', 'barcode', 'merge', 'featured', 'description',
    'background_color', 'text_color', 'button_width', 'button_height',
    'font_size', 'custom_name', 'weight', 'open_price', 'show_on_display',
    'promotion_uuid', 'product_type_id', 'parent_uuid',
    'product_attribute_size', 'product_attribute_colour', 'plu_code',
    'profit_margin', 'age_restriction_id', 'pop_note_id', 'country_id',
    'business_type_id', 'imei_number', 'serial_number', 'expiry_date',
    'is_active', 'is_pop_on', 'unit_uuid', 'group_uuid', 'brand_uuid',
    'department_uuid', 'tax_type_uuid', 'tax_uuid', 'image_name',
    'image_blurhash', 'gallery_id', 'gallery_uuid', 'custom_product',
  ];
}

function productValues(p) {
  return [
    p.uuid, p.id ?? null, p.created_at ?? null, p.updated_at ?? null,
    p.deleted_at ?? null, p.version ?? null,
    p.buying_price ?? null, p.selling_price ?? null, p.location_id ?? null,
    p.sale_channels ? JSON.stringify(p.sale_channels) : null,
    p.name, p.category_uuid ?? null, p.barcode ?? null,
    p.merge != null ? (p.merge ? 1 : 0) : null,
    p.featured != null ? (p.featured ? 1 : 0) : null,
    p.description ?? null, p.background_color ?? null, p.text_color ?? null,
    p.button_width ?? null, p.button_height ?? null, p.font_size ?? null,
    p.custom_name != null ? (p.custom_name ? 1 : 0) : null,
    p.weight != null ? (p.weight ? 1 : 0) : null,
    p.open_price != null ? (p.open_price ? 1 : 0) : null,
    p.show_on_display != null ? (p.show_on_display ? 1 : 0) : null,
    p.promotion_uuid ?? null, p.product_type_id ?? null, p.parent_uuid ?? null,
    p.product_attribute_size ?? null, p.product_attribute_colour ?? null,
    p.plu_code ?? null, p.profit_margin ?? null,
    p.age_restriction_id ?? null, p.pop_note_id ?? null,
    p.country_id ?? null, p.business_type_id ?? null,
    p.imei_number ?? null, p.serial_number ?? null, p.expiry_date ?? null,
    p.is_active != null ? (p.is_active ? 1 : 0) : null,
    p.is_pop_on != null ? (p.is_pop_on ? 1 : 0) : null,
    p.unit_uuid ?? null, p.group_uuid ?? null, p.brand_uuid ?? null,
    p.department_uuid ?? null, p.tax_type_uuid ?? null, p.tax_uuid ?? null,
    p.image_name ?? null, p.image_blurhash ?? null,
    p.gallery_id ?? null, p.gallery_uuid ?? null,
    p.custom_product != null ? (p.custom_product ? 1 : 0) : null,
  ];
}

function mapProduct(row) {
  return {
    ...row,
    sale_channels: row.sale_channels ? JSON.parse(row.sale_channels) : [],
    merge: row.merge === 1,
    featured: row.featured === 1,
    custom_name: row.custom_name === 1,
    weight: row.weight === 1,
    open_price: row.open_price === 1,
    show_on_display: row.show_on_display === 1,
    is_active: row.is_active === 1,
    is_pop_on: row.is_pop_on === 1,
    custom_product: row.custom_product === 1,
  };
}

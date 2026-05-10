// Categories Repository — JS clone of Flutter CategoriesRepository

export class CategoriesRepository {
  constructor(db) {
    this.db = db;
    this._cache = [];
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  /** Watch all categories; callback receives CategoriesModel[] */
  watchAllCategories(callback) {
    const run = async () => {
      const rows = await this.db.select(`SELECT * FROM categories_table`);
      this._cache = rows.map(mapCategory);
      callback(this._cache);
    };
    run();
    return this.db.subscribe?.('categories_table', run) ?? (() => {});
  }

  /** Eagerly load and cache all categories */
  async preloadCategories() {
    const rows = await this.db.select(`SELECT * FROM categories_table`);
    this._cache = rows.map(mapCategory);
    return this._cache;
  }

  getCachedCategories() {
    return this._cache;
  }

  async getAllCategories() {
    const rows = await this.db.select(`SELECT * FROM categories_table`);
    return rows.map(mapCategory);
  }

  async getCategoryNameByUuid(uuid) {
    const [row] = await this.db.select(
      `SELECT name FROM categories_table WHERE uuid = ?`, [uuid],
    );
    return row?.name ?? null;
  }

  async doesCategoryExistByName(name) {
    const rows = await this.db.select(
      `SELECT uuid FROM categories_table WHERE name = ? LIMIT 1`, [name],
    );
    return rows.length > 0;
  }

  /**
   * Watch parent-only categories for a display level (sorted by index).
   * Mirrors watchCategoriesByDisplayLevel — joins categories with display_level_categories.
   */
  watchCategoriesByDisplayLevel(displayLevelUuid, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT c.* FROM categories_table c
         INNER JOIN display_level_categories_table dlc ON dlc.category_uuid = c.uuid
         WHERE dlc.display_level_uuid = ? AND c.parent_uuid IS NULL
         ORDER BY CASE WHEN c."index" = 0 OR c."index" IS NULL THEN 0 ELSE 1 END,
                  c."index" ASC`,
        [displayLevelUuid],
      );
      callback(rows.map(mapCategory));
    };
    run();
    return this.db.subscribe?.('categories_table', run) ?? (() => {});
  }

  /** Watch ALL categories (parent + sub) for a display level */
  watchCategoriesByDisplayLevelAllParentAndSub(displayLevelUuid, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT c.* FROM categories_table c
         INNER JOIN display_level_categories_table dlc ON dlc.category_uuid = c.uuid
         WHERE dlc.display_level_uuid = ?`,
        [displayLevelUuid],
      );
      callback(rows.map(mapCategory));
    };
    run();
    return this.db.subscribe?.('categories_table', run) ?? (() => {});
  }

  /** Watch sub-categories for a parent within a display level */
  watchSubCategoriesByDisplayLevel(displayLevelUuid, parentCategoryUuid, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT c.* FROM categories_table c
         INNER JOIN display_level_categories_table dlc ON dlc.category_uuid = c.uuid
         WHERE dlc.display_level_uuid = ? AND c.parent_uuid = ?`,
        [displayLevelUuid, parentCategoryUuid],
      );
      callback(rows.map(mapCategory));
    };
    run();
    return this.db.subscribe?.('categories_table', run) ?? (() => {});
  }

  /** Watch sub-categories (any parent) for a display level */
  watchSubCategoriesByDisplayLevelWithoutParent(displayLevelUuid, callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT c.* FROM categories_table c
         INNER JOIN display_level_categories_table dlc ON dlc.category_uuid = c.uuid
         WHERE dlc.display_level_uuid = ? AND c.parent_uuid IS NOT NULL`,
        [displayLevelUuid],
      );
      callback(rows.map(mapCategory));
    };
    run();
    return this.db.subscribe?.('categories_table', run) ?? (() => {});
  }

  async getNextIndexValue() {
    try {
      const [row] = await this.db.select(
        `SELECT MAX("index") AS max_index FROM categories_table`,
      );
      return row?.max_index ?? 0;
    } catch {
      return 0;
    }
  }

  // ── WRITE ─────────────────────────────────────────────────────────────────

  async insertCategory(category) {
    const currentMaxIndex = await this.getNextIndexValue();
    const idx = category.index ?? currentMaxIndex + 1;
    return this.db.execute(
      `INSERT INTO categories_table
        (uuid, name, parent_uuid, created_at, version, font_size, "index",
         text_color, background_color, button_width, button_height, location_id,
         printers, description, show_on_display, product_type_id,
         tax_uuid, tax_type_uuid, background_image_url, background_image_blurhash)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        category.uuid, category.name, category.parent_uuid ?? null,
        category.created_at ?? null, category.version ?? null,
        category.font_size ?? null, idx,
        category.text_color ?? null, category.background_color ?? null,
        category.button_width ?? null, category.button_height ?? null,
        category.location_id ?? null,
        category.printers ? JSON.stringify(category.printers) : null,
        category.description ?? null,
        category.show_on_display != null ? (category.show_on_display ? 1 : 0) : null,
        category.product_type_id ?? null,
        category.tax_uuid ?? null, category.tax_type_uuid ?? null,
        category.background_image_url ?? null,
        category.background_image_blurhash ?? null,
      ],
    );
  }

  /** Bulk upsert — INSERT OR REPLACE */
  async createOrUpdateAll(categories) {
    for (const c of categories) {
      await this.db.execute(
        `INSERT OR REPLACE INTO categories_table
          (uuid, name, parent_uuid, created_at, updated_at, version, font_size,
           "index", text_color, background_color, button_width, button_height,
           location_id, printers, description, show_on_display, product_type_id,
           tax_uuid, tax_type_uuid, background_image_url, background_image_blurhash)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          c.uuid, c.name, c.parent_uuid ?? null, c.created_at ?? null,
          c.updated_at ?? null, c.version ?? null, c.font_size ?? null,
          c.index ?? null, c.text_color ?? null, c.background_color ?? null,
          c.button_width ?? null, c.button_height ?? null, c.location_id ?? null,
          c.printers ? JSON.stringify(c.printers) : null,
          c.description ?? null,
          c.show_on_display != null ? (c.show_on_display ? 1 : 0) : null,
          c.product_type_id ?? null,
          c.tax_uuid ?? null, c.tax_type_uuid ?? null,
          c.background_image_url ?? null, c.background_image_blurhash ?? null,
        ],
      );
    }
  }

  /** Delete category + its display_level_categories entries */
  async deleteCategoryByUuid(uuid) {
    await this.db.execute(
      `DELETE FROM display_level_categories_table WHERE category_uuid = ?`, [uuid],
    );
    return this.db.execute(
      `DELETE FROM categories_table WHERE uuid = ?`, [uuid],
    );
  }

  async deleteRecord(uuid) {
    return this.deleteCategoryByUuid(uuid);
  }

  /** Update button_height for all categories in a display level */
  async updateButtonHeightByDisplayLevel(displayLevelUuid, newButtonHeight) {
    const rows = await this.db.select(
      `SELECT category_uuid FROM display_level_categories_table WHERE display_level_uuid = ?`,
      [displayLevelUuid],
    );
    const uuids = rows.map(r => r.category_uuid).filter(Boolean);
    if (!uuids.length) return 0;
    const placeholders = uuids.map(() => '?').join(',');
    return this.db.execute(
      `UPDATE categories_table SET button_height = ? WHERE uuid IN (${placeholders})`,
      [newButtonHeight, ...uuids],
    );
  }
}

function mapCategory(row) {
  return {
    ...row,
    printers: row.printers ? JSON.parse(row.printers) : [],
    show_on_display: row.show_on_display === 1,
  };
}

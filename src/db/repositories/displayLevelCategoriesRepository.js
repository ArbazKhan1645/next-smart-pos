export class DisplayLevelCategoriesRepository {
  constructor(db) {
    this.db = db;
  }

  watchAllDisplayLevels(callback) {
    const run = async () => {
      const rows = await this.db.select(
        `SELECT * FROM display_level_categories_table`,
      );
      callback(rows);
    };
    run();
    return this.db.subscribe?.('display_level_categories_table', run) ?? (() => {});
  }

  async getAllDisplayLevel() {
    const rows = await this.db.select(
      `SELECT * FROM display_level_categories_table`,
    );
    return rows;
  }

  async insertDisplayLevel(category) {
    try {
      return await this.db.execute(
        `INSERT OR REPLACE INTO display_level_categories_table
          (uuid, display_level_uuid, category_uuid, created_at, updated_at, version)
         VALUES (?,?,?,?,?,?)`,
        [
          category.uuid, category.display_level_uuid ?? null,
          category.category_uuid ?? null, category.created_at ?? null,
          category.updated_at ?? null, category.version ?? null,
        ],
      );
    } catch (e) {
      console.error('insertDisplayLevel error:', e);
      return -1;
    }
  }

  async createOrUpdateAll(samples) {
    try {
      for (const s of samples) {
        await this.insertDisplayLevel(s);
      }
    } catch (e) {
      console.error('createOrUpdateAll displayLevelCategories error:', e);
      return -99999;
    }
  }
}

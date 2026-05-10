export class ProductModifiersRepository {
  constructor(db) {
    this.db = db;
  }

  watchProductModifierGroups({ productUuid }, callback) {
    const run = async () => {
      const rows = await this._queryProductModifierGroups(productUuid);
      callback(rows);
    };
    run();
    return this.db.subscribe?.('modifier_display_levels_locations_table', run) ?? (() => {});
  }

  async getProductModifierGroups({ productUuid }) {
    return this._queryProductModifierGroups(productUuid);
  }

  async hasModifierGroupsForProduct(productUuid) {
    const rows = await this.db.select(
      `SELECT 1 FROM modifier_display_levels_locations_table mdl
       INNER JOIN modifier_groups_table mg ON mdl.modifier_group_uuid = mg.uuid
       WHERE mdl.product_uuid = ? LIMIT 1`,
      [productUuid],
    );
    return rows.length > 0;
  }

  async _queryProductModifierGroups(productUuid) {
    const rows = await this.db.select(
      `SELECT mg.*, mdl.modifier_group_uuid, p.id AS location_product_id
       FROM modifier_display_levels_locations_table mdl
       INNER JOIN modifier_groups_table mg ON mdl.modifier_group_uuid = mg.uuid
       INNER JOIN products_table p ON mdl.product_uuid = p.uuid
       WHERE mdl.product_uuid = ?`,
      [productUuid],
    );

    const seen = new Set();
    const result = [];
    for (const row of rows) {
      const key = `${row.modifier_group_uuid}-${row.location_product_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(new ProductModifierGroup({
          id: row.id ?? null,
          createdAt: row.created_at ?? null,
          updatedAt: row.updated_at ?? null,
          backgroundColor: row.background_color ?? '',
          textColor: row.text_color ?? '',
          buttonHeight: row.button_height ?? 130,
          min: row.minimum ?? 0,
          max: row.maximum ?? 0,
          name: row.name ?? '',
          modifierGroupUuid: row.modifier_group_uuid ?? '',
          locationProductId: row.location_product_id ?? 0,
        }));
      }
    }
    return result;
  }
}

export class ProductModifierGroup {
  constructor({ id, createdAt, updatedAt, backgroundColor, textColor, buttonHeight, min, max, name, modifierGroupUuid, locationProductId }) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
    this.buttonHeight = buttonHeight ?? 130;
    this.min = min;
    this.max = max;
    this.name = name;
    this.modifierGroupUuid = modifierGroupUuid;
    this.locationProductId = locationProductId;
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      modifier_group_uuid: this.modifierGroupUuid,
      location_product_id: this.locationProductId,
      min: this.min,
      max: this.max,
      background_color: this.backgroundColor,
      text_color: this.textColor,
      button_height: this.buttonHeight,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  static fromJson(json) {
    return new ProductModifierGroup({
      id: json.id,
      name: json.name,
      modifierGroupUuid: json.modifier_group_uuid,
      locationProductId: json.location_product_id,
      min: json.min,
      max: json.max,
      backgroundColor: json.background_color,
      textColor: json.text_color,
      buttonHeight: json.button_height,
      createdAt: json.created_at,
      updatedAt: json.updated_at,
    });
  }
}

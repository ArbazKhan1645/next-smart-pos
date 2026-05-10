export class ModifiersRepository {
  constructor(db) {
    this.db = db;
  }

  watchJoinedModifiers({ modifierGroupUuid, productUuid = null }, callback) {
    const run = async () => {
      let sql = `
        SELECT lm.*, mdl.sale_price AS _sale_price
        FROM location_modifiers_table lm
        INNER JOIN modifier_display_levels_locations_table mdl
          ON mdl.modifier_uuid = lm.uuid
        WHERE mdl.modifier_group_uuid = ?`;
      const params = [modifierGroupUuid];

      if (productUuid != null) {
        sql += ` AND mdl.product_uuid = ?`;
        params.push(productUuid);
      }

      const rows = await this.db.select(sql, params);
      callback(rows.map(mapJoinedModifier));
    };
    run();
    return this.db.subscribe?.('location_modifiers_table', run) ?? (() => {});
  }
}

export class JoinedModifier {
  constructor({ id, name, uuid, costPrice, salePrice, taxUuid, taxTypeUuid, merge, openPrice, customName }) {
    this.id = id;
    this.name = name;
    this.uuid = uuid;
    this.costPrice = costPrice;
    this.salePrice = salePrice;
    this.taxUuid = taxUuid;
    this.taxTypeUuid = taxTypeUuid;
    this.merge = merge;
    this.openPrice = openPrice;
    this.customName = customName;
  }

  copyWith({ id, name, uuid, costPrice, salePrice, taxUuid, taxTypeUuid, merge, openPrice, customName } = {}) {
    return new JoinedModifier({
      id: id ?? this.id,
      name: name ?? this.name,
      uuid: uuid ?? this.uuid,
      costPrice: costPrice ?? this.costPrice,
      salePrice: salePrice ?? this.salePrice,
      taxUuid: taxUuid ?? this.taxUuid,
      taxTypeUuid: taxTypeUuid ?? this.taxTypeUuid,
      merge: merge ?? this.merge,
      openPrice: openPrice ?? this.openPrice,
      customName: customName ?? this.customName,
    });
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      uuid: this.uuid,
      cost_price: this.costPrice,
      sale_price: this.salePrice,
      tax_uuid: this.taxUuid,
      tax_type_uuid: this.taxTypeUuid,
      merge: this.merge,
      open_price: this.openPrice,
      custom_name: this.customName,
    };
  }

  static fromJson(json) {
    return new JoinedModifier({
      id: json.id,
      name: json.name,
      uuid: json.uuid,
      costPrice: json.cost_price,
      salePrice: json.sale_price,
      taxUuid: json.tax_uuid,
      taxTypeUuid: json.tax_type_uuid,
      merge: json.merge,
      openPrice: json.open_price,
      customName: json.custom_name,
    });
  }
}

function mapJoinedModifier(row) {
  return new JoinedModifier({
    id: row.id ?? 0,
    name: row.name ?? '',
    uuid: row.uuid ?? '',
    costPrice: row.cost_price ?? 0,
    salePrice: row._sale_price ?? row.base_price ?? 0,
    taxUuid: row.tax_uuid ?? '',
    taxTypeUuid: row.tax_type_uuid ?? '',
    merge: row.merge === 1,
    openPrice: row.open_price === 1,
    customName: row.custom_name === 1,
  });
}

// DB schema definitions mirroring Flutter/Drift table structures.
// Each table entry describes column names, types, nullability, and defaults.
// Use this as the blueprint when wiring up the actual SQLite/Tauri DB layer.

export const COLUMN_TYPES = {
  INTEGER: 'integer',
  REAL: 'real',
  TEXT: 'text',
  BOOLEAN: 'boolean',
  DATETIME: 'datetime',
  BLOB: 'blob',
  JSON: 'json', // stored as TEXT, parsed as JSON
};

const col = (type, nullable = true, defaultVal = undefined) => ({
  type,
  nullable,
  ...(defaultVal !== undefined ? { default: defaultVal } : {}),
});

const T = COLUMN_TYPES;

// ---------------------------------------------------------------------------
// products_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const PRODUCTS_TABLE = {
  tableName: 'products_table',
  primaryKey: 'uuid',
  columns: {
    id:                       col(T.INTEGER),
    uuid:                     col(T.TEXT, false),
    created_at:               col(T.DATETIME),
    updated_at:               col(T.DATETIME),
    deleted_at:               col(T.DATETIME),
    version:                  col(T.INTEGER),
    buying_price:             col(T.REAL),
    selling_price:            col(T.REAL),
    location_id:              col(T.INTEGER),
    sale_channels:            col(T.JSON),         // List<SaleChannelModel>
    name:                     col(T.TEXT, false),
    category_uuid:            col(T.TEXT),
    barcode:                  col(T.TEXT),
    merge:                    col(T.BOOLEAN),
    featured:                 col(T.BOOLEAN),
    description:              col(T.TEXT),
    background_color:         col(T.TEXT),
    text_color:               col(T.TEXT),
    button_width:             col(T.REAL),
    button_height:            col(T.REAL),
    font_size:                col(T.REAL),
    custom_name:              col(T.BOOLEAN),
    weight:                   col(T.BOOLEAN),
    open_price:               col(T.BOOLEAN),
    show_on_display:          col(T.BOOLEAN),
    promotion_uuid:           col(T.TEXT),
    product_type_id:          col(T.INTEGER),
    parent_uuid:              col(T.TEXT),
    product_attribute_size:   col(T.TEXT),
    product_attribute_colour: col(T.TEXT),
    plu_code:                 col(T.TEXT),
    profit_margin:            col(T.TEXT),
    age_restriction_id:       col(T.INTEGER),
    pop_note_id:              col(T.INTEGER),
    country_id:               col(T.INTEGER),
    business_type_id:         col(T.INTEGER),
    imei_number:              col(T.TEXT),
    serial_number:            col(T.INTEGER),
    expiry_date:              col(T.DATETIME),
    is_active:                col(T.BOOLEAN),
    is_pop_on:                col(T.BOOLEAN),
    unit_uuid:                col(T.TEXT),
    group_uuid:               col(T.TEXT),
    brand_uuid:               col(T.TEXT),
    department_uuid:          col(T.TEXT),
    tax_type_uuid:            col(T.TEXT),
    tax_uuid:                 col(T.TEXT),
    image_name:               col(T.TEXT),
    image_blurhash:           col(T.TEXT),
    gallery_id:               col(T.INTEGER),
    gallery_uuid:             col(T.TEXT),
    custom_product:           col(T.BOOLEAN),
    name_embedding:           col(T.BLOB),
  },
};

// ---------------------------------------------------------------------------
// categories_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const CATEGORIES_TABLE = {
  tableName: 'categories_table',
  primaryKey: 'uuid',
  columns: {
    id:                         col(T.INTEGER),
    uuid:                       col(T.TEXT),
    created_at:                 col(T.DATETIME),
    updated_at:                 col(T.DATETIME),
    version:                    col(T.INTEGER),
    location_id:                col(T.INTEGER),
    background_color:           col(T.TEXT),
    text_color:                 col(T.TEXT),
    name:                       col(T.TEXT, false),
    parent_uuid:                col(T.TEXT),
    button_height:              col(T.REAL),
    button_width:               col(T.REAL),
    font_size:                  col(T.REAL),
    description:                col(T.TEXT),
    show_on_display:            col(T.BOOLEAN),
    product_cols:               col(T.INTEGER),
    product_type_id:            col(T.INTEGER),
    department_uuid:            col(T.TEXT),
    unit:                       col(T.TEXT),
    reorder:                    col(T.INTEGER),
    age_restriction_id:         col(T.INTEGER),
    printers:                   col(T.JSON),       // List<printer_uuids>
    profit_margin:              col(T.TEXT),
    tax_uuid:                   col(T.TEXT),
    tax_type_uuid:              col(T.TEXT),
    background_image_url:       col(T.TEXT),
    background_image_blurhash:  col(T.TEXT),
    index:                      col(T.INTEGER),
    name_embedding:             col(T.BLOB),
  },
};

// ---------------------------------------------------------------------------
// customers_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const CUSTOMERS_TABLE = {
  tableName: 'customers_table',
  primaryKey: 'uuid',
  columns: {
    id:                 col(T.INTEGER),
    uuid:               col(T.TEXT),
    created_at:         col(T.TEXT),
    updated_at:         col(T.TEXT),
    operation_at:       col(T.TEXT),
    version:            col(T.INTEGER),
    first_name:         col(T.TEXT),
    last_name:          col(T.TEXT),
    email:              col(T.TEXT),
    phone:              col(T.TEXT),
    zip_or_postal_code: col(T.TEXT),
    building_number:    col(T.TEXT),
    street:             col(T.TEXT),
    city:               col(T.TEXT),
    customer_type_id:   col(T.INTEGER),
    location_id:        col(T.INTEGER),
    country_id:         col(T.INTEGER),
    is_default:         col(T.BOOLEAN),
    custom_tier_uuid:   col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// staffs_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const STAFFS_TABLE = {
  tableName: 'staffs_table',
  primaryKey: 'uuid',
  columns: {
    id:                    col(T.INTEGER),
    number:                col(T.TEXT, false),
    uuid:                  col(T.TEXT, false),
    created_at:            col(T.DATETIME),
    updated_at:            col(T.DATETIME),
    version:               col(T.INTEGER),
    first_name:            col(T.TEXT, false),
    last_name:             col(T.TEXT, false),
    email:                 col(T.TEXT, false),
    phone:                 col(T.TEXT, false),
    merchant_id:           col(T.INTEGER),
    role_uuid:             col(T.TEXT, false),
    location_id:           col(T.INTEGER),
    is_active:             col(T.BOOLEAN),
    is_quick_login:        col(T.BOOLEAN),
    is_logout_after_sale:  col(T.BOOLEAN),
    is_cash_drawer:        col(T.BOOLEAN),
    is_super_user:         col(T.BOOLEAN),
    is_training_staff:     col(T.BOOLEAN),
    is_show_driver:        col(T.BOOLEAN),
    is_waiter:             col(T.BOOLEAN),
    password:              col(T.TEXT),
    pin:                   col(T.TEXT),
    is_engineer:           col(T.BOOLEAN),
  },
};

// ---------------------------------------------------------------------------
// terminal_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const TERMINAL_TABLE = {
  tableName: 'terminal_table',
  primaryKey: 'uuid',
  columns: {
    id:                            col(T.INTEGER),
    uuid:                          col(T.TEXT),
    created_at:                    col(T.DATETIME),
    updated_at:                    col(T.DATETIME),
    version:                       col(T.INTEGER),
    local_id:                      col(T.INTEGER),
    name:                          col(T.TEXT),
    location_id:                   col(T.INTEGER),
    terminal_id:                   col(T.TEXT),
    pos_theme_uuid:                col(T.TEXT),
    default_printer_uuid:          col(T.TEXT),
    suspend:                       col(T.BOOLEAN),
    ip_address:                    col(T.TEXT),
    device_id:                     col(T.TEXT),
    device_activation_token_uuid:  col(T.TEXT),
    is_online:                     col(T.BOOLEAN),
    terminal_status_table_id:      col(T.INTEGER),
    device_name:                   col(T.TEXT),
    device_os:                     col(T.TEXT),
    device_os_id:                  col(T.TEXT),
    device_type_uuid:              col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// modifier_groups_table  (primaryKey: id)
// ---------------------------------------------------------------------------
export const MODIFIER_GROUPS_TABLE = {
  tableName: 'modifier_groups_table',
  primaryKey: 'id',
  columns: {
    id:               col(T.INTEGER),
    created_at:       col(T.DATETIME),
    updated_at:       col(T.DATETIME),
    name:             col(T.TEXT),
    location_id:      col(T.INTEGER),
    uuid:             col(T.TEXT),
    department_uuid:  col(T.TEXT),
    version:          col(T.INTEGER),
    minimum:          col(T.INTEGER),
    text_color:       col(T.TEXT),
    maximum:          col(T.INTEGER),
    background_color: col(T.TEXT),
    button_height:    col(T.REAL),
  },
};

// ---------------------------------------------------------------------------
// location_modifiers_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const LOCATION_MODIFIERS_TABLE = {
  tableName: 'location_modifiers_table',
  primaryKey: 'uuid',
  columns: {
    id:            col(T.INTEGER),
    uuid:          col(T.TEXT),
    created_at:    col(T.DATETIME),
    updated_at:    col(T.DATETIME),
    version:       col(T.INTEGER),
    name:          col(T.TEXT),
    cost_price:    col(T.REAL),
    description:   col(T.TEXT),
    open_price:    col(T.BOOLEAN),
    custom_name:   col(T.BOOLEAN),
    merge:         col(T.BOOLEAN),
    location_id:   col(T.INTEGER),
    base_price:    col(T.REAL),
    tax_uuid:      col(T.TEXT),
    tax_type_uuid: col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// modifier_display_levels_locations_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const MODIFIER_DISPLAY_LEVELS_LOCATIONS_TABLE = {
  tableName: 'modifier_display_levels_locations_table',
  primaryKey: 'uuid',
  columns: {
    id:                  col(T.INTEGER),
    uuid:                col(T.TEXT),
    created_at:          col(T.DATETIME),
    updated_at:          col(T.DATETIME),
    version:             col(T.INTEGER),
    modifier_group_uuid: col(T.TEXT),
    product_uuid:        col(T.TEXT),
    location_id:         col(T.INTEGER),
    sale_price:          col(T.REAL),
    modifier_uuid:       col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// sale_channels_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const SALE_CHANNELS_TABLE = {
  tableName: 'sale_channels_table',
  primaryKey: 'uuid',
  columns: {
    id:          col(T.INTEGER),
    uuid:        col(T.TEXT, false),
    created_at:  col(T.TEXT),
    updated_at:  col(T.TEXT),
    version:     col(T.INTEGER),
    name:        col(T.TEXT),
    type:        col(T.TEXT),
    description: col(T.TEXT),
    is_active:   col(T.BOOLEAN),
    logo:        col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// locations_and_sale_channels_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const LOCATIONS_AND_SALE_CHANNELS_TABLE = {
  tableName: 'locations_and_sale_channels_table',
  primaryKey: 'uuid',
  columns: {
    id:                                   col(T.INTEGER),
    uuid:                                 col(T.TEXT),
    created_at:                           col(T.TEXT),
    updated_at:                           col(T.TEXT),
    version:                              col(T.INTEGER),
    location_id:                          col(T.INTEGER),
    sale_channel_id:                      col(T.INTEGER),
    sale_channel_mode_id:                 col(T.INTEGER),
    start_duration:                       col(T.TEXT),
    end_duration:                         col(T.TEXT),
    hse_partner_order_percentage_uuid:    col(T.TEXT),
    hse_partner_service_charges_uuid:     col(T.TEXT),
    subscription_uuid:                    col(T.TEXT),
    name:                                 col(T.TEXT),
    is_active:                            col(T.BOOLEAN),
  },
};

// ---------------------------------------------------------------------------
// ext_orders_table  (autoIncrement pk: id)
// ---------------------------------------------------------------------------
export const EXT_ORDERS_TABLE = {
  tableName: 'ext_orders_table',
  primaryKey: 'id',
  autoIncrement: true,
  columns: {
    id:                      col(T.INTEGER),
    uuid:                    col(T.TEXT),
    local_id:                col(T.INTEGER),
    supabase_id:             col(T.INTEGER),
    microservice_id:         col(T.INTEGER),
    location_id:             col(T.INTEGER),
    terminal_id:             col(T.INTEGER),
    service_type:            col(T.TEXT),
    sale_channel_type:       col(T.TEXT),
    created_at:              col(T.DATETIME),
    updated_at:              col(T.DATETIME),
    version:                 col(T.INTEGER),
    synced_at:               col(T.DATETIME),
    deleted_at:              col(T.DATETIME),
    ticket_status_timestamp: col(T.DATETIME),
    status_timestamp:        col(T.DATETIME),
    operation_at:            col(T.DATETIME),
    mode:                    col(T.TEXT),
    country:                 col(T.TEXT),
    order_number:            col(T.INTEGER),
    customer_uuid:           col(T.TEXT),
    last_status:             col(T.TEXT),
    discount:                col(T.TEXT),
    status_stages:           col(T.JSON),
    ticket_status_stages:    col(T.JSON),
    products:                col(T.JSON),
    payments:                col(T.JSON),
  },
};

// ---------------------------------------------------------------------------
// discounts_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const DISCOUNTS_TABLE = {
  tableName: 'discounts_table',
  primaryKey: 'uuid',
  columns: {
    id:               col(T.INTEGER),
    created_at:       col(T.DATETIME),
    updated_at:       col(T.DATETIME),
    uuid:             col(T.TEXT, false),
    version:          col(T.INTEGER),
    name:             col(T.TEXT),
    amount:           col(T.REAL),
    discount_type_id: col(T.INTEGER),
    location_id:      col(T.INTEGER),
  },
};

// ---------------------------------------------------------------------------
// printers_table  (autoIncrement pk: id)
// ---------------------------------------------------------------------------
export const PRINTERS_TABLE = {
  tableName: 'printers_table',
  primaryKey: 'id',
  autoIncrement: true,
  columns: {
    id:               col(T.INTEGER, false),
    uuid:             col(T.TEXT, false),
    name:             col(T.TEXT, false),
    description:      col(T.TEXT),
    printer_type:     col(T.TEXT, false),
    hardware_name:    col(T.TEXT, false),
    hardware_type:    col(T.TEXT, false),
    receipt_template: col(T.TEXT, false, 'default'),
    is_enabled:       col(T.BOOLEAN, false, true),
    is_default:       col(T.BOOLEAN, false, false),
    paper_width:      col(T.INTEGER, false, 80),
    auto_cut:         col(T.BOOLEAN, false, true),
    open_drawer:      col(T.BOOLEAN, false, false),
    copies:           col(T.INTEGER, false, 1),
    created_at:       col(T.DATETIME, false),
    updated_at:       col(T.DATETIME),
  },
};

// ---------------------------------------------------------------------------
// print_jobs_table  (autoIncrement pk: id)
// ---------------------------------------------------------------------------
export const PRINT_JOBS_TABLE = {
  tableName: 'print_jobs_table',
  primaryKey: 'id',
  autoIncrement: true,
  columns: {
    id:                      col(T.INTEGER, false),
    uuid:                    col(T.TEXT, false),
    order_uuid:              col(T.TEXT, false),
    printer_config_uuid:     col(T.TEXT, false),
    hardware_printer_address: col(T.TEXT),
    job_type:                col(T.TEXT, false),
    status:                  col(T.TEXT, false, 'pending'),
    priority:                col(T.TEXT, false, 'normal'),
    payload:                 col(T.TEXT, false),
    retry_count:             col(T.INTEGER, false, 0),
    max_retries:             col(T.INTEGER, false, 3),
    error_message:           col(T.TEXT),
    created_at:              col(T.DATETIME, false),
    processed_at:            col(T.DATETIME),
    completed_at:            col(T.DATETIME),
    scheduled_at:            col(T.DATETIME),
    category_uuid:           col(T.TEXT),
    products:                col(T.JSON),
  },
};

// ---------------------------------------------------------------------------
// units_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const UNITS_TABLE = {
  tableName: 'units_table',
  primaryKey: 'uuid',
  columns: {
    id:         col(T.INTEGER),
    uuid:       col(T.TEXT, false),
    created_at: col(T.INTEGER),
    updated_at: col(T.INTEGER),
    version:    col(T.INTEGER, true, 0),
    name:       col(T.TEXT, false),
    type:       col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// service_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const SERVICE_TABLE = {
  tableName: 'service_table',
  primaryKey: 'uuid',
  columns: {
    id:                 col(T.INTEGER),
    uuid:               col(T.TEXT),
    created_at:         col(T.DATETIME),
    updated_at:         col(T.DATETIME),
    version:            col(T.INTEGER),
    name:               col(T.TEXT),
    service_type_id:    col(T.INTEGER),
    icon_data:          col(T.TEXT),
    location_id:        col(T.INTEGER),
    display_level_uuid: col(T.TEXT),
    sale_channels:      col(T.JSON),
    serve_min_time:     col(T.INTEGER),
    serve_max_time:     col(T.INTEGER),
  },
};

// ---------------------------------------------------------------------------
// service_type_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const SERVICE_TYPE_TABLE = {
  tableName: 'service_type_table',
  primaryKey: 'uuid',
  columns: {
    id:         col(T.INTEGER),
    created_at: col(T.DATETIME),
    update_at:  col(T.DATETIME),
    local_id:   col(T.INTEGER),
    uuid:       col(T.TEXT),
    version:    col(T.INTEGER),
    name:       col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// display_levels_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const DISPLAY_LEVELS_TABLE = {
  tableName: 'display_levels_table',
  primaryKey: 'uuid',
  columns: {
    id:          col(T.INTEGER),
    uuid:        col(T.TEXT),
    created_at:  col(T.DATETIME),
    updated_at:  col(T.DATETIME),
    version:     col(T.INTEGER),
    title:       col(T.TEXT),
    location_id: col(T.INTEGER),
  },
};

// ---------------------------------------------------------------------------
// display_level_categories_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const DISPLAY_LEVEL_CATEGORIES_TABLE = {
  tableName: 'display_level_categories_table',
  primaryKey: 'uuid',
  columns: {
    id:                  col(T.INTEGER),
    uuid:                col(T.TEXT),
    created_at:          col(T.DATETIME),
    updated_at:          col(T.DATETIME),
    version:             col(T.INTEGER),
    category_uuid:       col(T.TEXT),
    sub_category_uuid:   col(T.TEXT),
    display_level_uuid:  col(T.TEXT),
    product_uuid:        col(T.TEXT),
    location_id:         col(T.INTEGER),
    order_number:        col(T.INTEGER),
  },
};

// ---------------------------------------------------------------------------
// meal_deal_group_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const MEAL_DEAL_GROUP_TABLE = {
  tableName: 'meal_deal_group_table',
  primaryKey: 'uuid',
  columns: {
    id:           col(T.INTEGER),
    created_at:   col(T.DATETIME),
    updated_at:   col(T.DATETIME),
    uuid:         col(T.TEXT),
    version:      col(T.INTEGER),
    name:         col(T.TEXT),
    location_id:  col(T.INTEGER),
    product_uuid: col(T.TEXT),
    minimum:      col(T.INTEGER),
    maximum:      col(T.INTEGER),
  },
};

// ---------------------------------------------------------------------------
// meal_deal_junction_table  (compositePK: uuid + product_uuid + meal_deal_group_uuid)
// ---------------------------------------------------------------------------
export const MEAL_DEAL_JUNCTION_TABLE = {
  tableName: 'meal_deal_junction_table',
  primaryKey: ['uuid', 'product_uuid', 'meal_deal_group_uuid'],
  columns: {
    id:                   col(T.INTEGER),
    created_at:           col(T.DATETIME),
    updated_at:           col(T.DATETIME),
    location_id:          col(T.INTEGER),
    uuid:                 col(T.TEXT),
    version:              col(T.INTEGER),
    meal_deal_group_uuid: col(T.TEXT),
    product_uuid:         col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// terminal_service_junction_table  (primaryKey: uuid)
// ---------------------------------------------------------------------------
export const TERMINAL_SERVICE_JUNCTION_TABLE = {
  tableName: 'terminal_service_junction_table',
  primaryKey: 'uuid',
  columns: {
    id:                 col(T.INTEGER),
    created_at:         col(T.TEXT),
    updated_at:         col(T.TEXT),
    uuid:               col(T.TEXT),
    version:            col(T.INTEGER),
    terminal_id:        col(T.INTEGER),
    service_uuid:       col(T.TEXT),
    display_level_uuid: col(T.TEXT),
    location_id:        col(T.INTEGER),
    sale_channel_id:    col(T.INTEGER),
    is_available:       col(T.BOOLEAN),
    is_default:         col(T.BOOLEAN),
    is_active:          col(T.BOOLEAN),
  },
};

// ---------------------------------------------------------------------------
// promotions_table  (primaryKey: id)
// ---------------------------------------------------------------------------
export const PROMOTIONS_TABLE = {
  tableName: 'promotions_table',
  primaryKey: 'id',
  columns: {
    id:                    col(T.TEXT, false),
    name:                  col(T.TEXT, false),
    description:           col(T.TEXT),
    type:                  col(T.INTEGER, false),  // PromotionType enum index
    applicable_product_ids: col(T.TEXT, false),    // comma-separated UUIDs
    min_quantity:          col(T.INTEGER, false, 1),
    discount_percent:      col(T.REAL),
    discount_amount:       col(T.REAL),
    free_product_id:       col(T.TEXT),
    free_product_qty:      col(T.INTEGER),
    discount_on_items:     col(T.INTEGER),
    is_active:             col(T.BOOLEAN, false, true),
    start_date:            col(T.DATETIME),
    end_date:              col(T.DATETIME),
    priority:              col(T.INTEGER, false, 0),
    created_at:            col(T.DATETIME, false),
    updated_at:            col(T.DATETIME, false),
    is_synced:             col(T.BOOLEAN, false, false),
  },
};

// ---------------------------------------------------------------------------
// daily_reports_table  (primaryKey: id, unique: [report_date, location_id])
// ---------------------------------------------------------------------------
export const DAILY_REPORTS_TABLE = {
  tableName: 'daily_reports_table',
  primaryKey: 'id',
  uniqueKeys: [['report_date', 'location_id']],
  columns: {
    id:                          col(T.INTEGER),
    uuid:                        col(T.TEXT, false),
    report_date:                 col(T.TEXT, false),  // YYYY-MM-DD
    total_sales:                 col(T.REAL, false, 0),
    total_cost:                  col(T.REAL, false, 0),
    gross_profit:                col(T.REAL, false, 0),
    net_profit:                  col(T.REAL, false, 0),
    total_orders:                col(T.INTEGER, false, 0),
    total_items_sold:            col(T.INTEGER, false, 0),
    average_order_value:         col(T.REAL, false, 0),
    best_selling_product_uuid:   col(T.TEXT),
    best_selling_category_uuid:  col(T.TEXT),
    hourly_breakdown:            col(T.JSON),
    payment_methods:             col(T.JSON),
    service_types:               col(T.JSON),
    location_id:                 col(T.TEXT),
    created_at:                  col(T.DATETIME, false),
  },
};

// ---------------------------------------------------------------------------
// batch_reports_table  (primaryKey: id)
// ---------------------------------------------------------------------------
export const BATCH_REPORTS_TABLE = {
  tableName: 'batch_reports_table',
  primaryKey: 'id',
  columns: {
    id:                        col(T.INTEGER),
    uuid:                      col(T.TEXT, false),
    batch_name:                col(T.TEXT, false),
    start_date:                col(T.DATETIME, false),
    end_date:                  col(T.DATETIME),
    status:                    col(T.TEXT, false, 'ACTIVE'),
    total_sales:               col(T.REAL, false, 0),
    total_cost:                col(T.REAL, false, 0),
    gross_profit:              col(T.REAL, false, 0),
    net_profit:                col(T.REAL, false, 0),
    total_orders:              col(T.INTEGER, false, 0),
    total_items_sold:          col(T.INTEGER, false, 0),
    location_id:               col(T.TEXT),
    terminal_id:               col(T.TEXT),
    category_breakdown:        col(T.JSON),
    product_breakdown:         col(T.JSON),
    payment_method_breakdown:  col(T.JSON),
    service_type_breakdown:    col(T.JSON),
    created_at:                col(T.DATETIME, false),
    updated_at:                col(T.DATETIME, false),
    closed_at:                 col(T.DATETIME),
  },
};

// ---------------------------------------------------------------------------
// sync_status_table  (autoIncrement pk: id)
// ---------------------------------------------------------------------------
export const SYNC_STATUS_TABLE = {
  tableName: 'sync_status_table',
  primaryKey: 'id',
  autoIncrement: true,
  columns: {
    id:             col(T.INTEGER, false),
    last_sync_time: col(T.INTEGER, false),  // millisecondsSinceEpoch
  },
};

// ---------------------------------------------------------------------------
// ext_query_models_table  (no explicit PK defined)
// ---------------------------------------------------------------------------
export const EXT_QUERY_TABLE = {
  tableName: 'ext_query_models_table',
  primaryKey: null,
  columns: {
    id:             col(T.TEXT),
    uuid:           col(T.TEXT),
    created_at:     col(T.TEXT),
    operation_at:   col(T.TEXT),
    updated_at:     col(T.TEXT),
    deleted_at:     col(T.TEXT),
    synced_at:      col(T.TEXT),
    version:        col(T.INTEGER),
    supabase_id:    col(T.INTEGER),
    microservice_id: col(T.INTEGER),
    entity:         col(T.TEXT),
    operation:      col(T.TEXT),
    entity_id:      col(T.TEXT),
    location_id:    col(T.TEXT),
    retry_count:    col(T.INTEGER),
    is_defective:   col(T.BOOLEAN),
    error_message:  col(T.TEXT),
  },
};

// ---------------------------------------------------------------------------
// All tables registry
// ---------------------------------------------------------------------------
export const ALL_TABLES = {
  PRODUCTS:                          PRODUCTS_TABLE,
  CATEGORIES:                        CATEGORIES_TABLE,
  CUSTOMERS:                         CUSTOMERS_TABLE,
  STAFFS:                            STAFFS_TABLE,
  TERMINALS:                         TERMINAL_TABLE,
  MODIFIER_GROUPS:                   MODIFIER_GROUPS_TABLE,
  LOCATION_MODIFIERS:                LOCATION_MODIFIERS_TABLE,
  MODIFIER_DISPLAY_LEVELS_LOCATIONS: MODIFIER_DISPLAY_LEVELS_LOCATIONS_TABLE,
  SALE_CHANNELS:                     SALE_CHANNELS_TABLE,
  LOCATIONS_AND_SALE_CHANNELS:       LOCATIONS_AND_SALE_CHANNELS_TABLE,
  EXT_ORDERS:                        EXT_ORDERS_TABLE,
  DISCOUNTS:                         DISCOUNTS_TABLE,
  PRINTERS:                          PRINTERS_TABLE,
  PRINT_JOBS:                        PRINT_JOBS_TABLE,
  UNITS:                             UNITS_TABLE,
  SERVICES:                          SERVICE_TABLE,
  SERVICE_TYPES:                     SERVICE_TYPE_TABLE,
  DISPLAY_LEVELS:                    DISPLAY_LEVELS_TABLE,
  DISPLAY_LEVEL_CATEGORIES:          DISPLAY_LEVEL_CATEGORIES_TABLE,
  MEAL_DEAL_GROUPS:                  MEAL_DEAL_GROUP_TABLE,
  MEAL_DEAL_JUNCTIONS:               MEAL_DEAL_JUNCTION_TABLE,
  TERMINAL_SERVICE_JUNCTIONS:        TERMINAL_SERVICE_JUNCTION_TABLE,
  PROMOTIONS:                        PROMOTIONS_TABLE,
  DAILY_REPORTS:                     DAILY_REPORTS_TABLE,
  BATCH_REPORTS:                     BATCH_REPORTS_TABLE,
  SYNC_STATUS:                       SYNC_STATUS_TABLE,
  EXT_QUERY:                         EXT_QUERY_TABLE,
};

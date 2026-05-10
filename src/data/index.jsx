// Sample data matching Flutter/Drift table column names exactly.
// All field names mirror the corresponding Dart table class getters.

// ---------------------------------------------------------------------------
// Sale Channels  (sale_channels_table)
// ---------------------------------------------------------------------------
export const SALE_CHANNELS = [
  { id: 1, uuid: 'sc-uuid-001', name: 'Dine-in',    type: 'dine_in',   description: 'In-restaurant dining',    is_active: true,  logo: null, created_at: null, updated_at: null, version: 1 },
  { id: 2, uuid: 'sc-uuid-002', name: 'Takeaway',   type: 'takeaway',  description: 'Customer collects order', is_active: true,  logo: null, created_at: null, updated_at: null, version: 1 },
  { id: 3, uuid: 'sc-uuid-003', name: 'Delivery',   type: 'delivery',  description: 'Third-party delivery',    is_active: true,  logo: null, created_at: null, updated_at: null, version: 1 },
  { id: 4, uuid: 'sc-uuid-004', name: 'QR Order',   type: 'qr',        description: 'Customer scans QR',       is_active: true,  logo: null, created_at: null, updated_at: null, version: 1 },
  { id: 5, uuid: 'sc-uuid-005', name: 'Drive-thru', type: 'drive_thru',description: 'Drive-through window',    is_active: true,  logo: null, created_at: null, updated_at: null, version: 1 },
  { id: 6, uuid: 'sc-uuid-006', name: 'In-store',   type: 'in_store',  description: 'Retail in-store',         is_active: true,  logo: null, created_at: null, updated_at: null, version: 1 },
];

// ---------------------------------------------------------------------------
// Service Types  (service_type_table)
// ---------------------------------------------------------------------------
export const SERVICE_TYPES = [
  { id: 1, uuid: 'st-uuid-001', name: 'Table Service', local_id: 1, version: 1, created_at: null, update_at: null },
  { id: 2, uuid: 'st-uuid-002', name: 'Counter',       local_id: 2, version: 1, created_at: null, update_at: null },
  { id: 3, uuid: 'st-uuid-003', name: 'Delivery',      local_id: 3, version: 1, created_at: null, update_at: null },
  { id: 4, uuid: 'st-uuid-004', name: 'Drive-thru',    local_id: 4, version: 1, created_at: null, update_at: null },
];

// ---------------------------------------------------------------------------
// Units  (units_table)
// ---------------------------------------------------------------------------
export const UNITS = [
  { id: 1, uuid: 'unit-uuid-001', name: 'Each',  type: 'count',  version: 1, created_at: null, updated_at: null },
  { id: 2, uuid: 'unit-uuid-002', name: 'Kg',    type: 'weight', version: 1, created_at: null, updated_at: null },
  { id: 3, uuid: 'unit-uuid-003', name: 'Litre', type: 'volume', version: 1, created_at: null, updated_at: null },
  { id: 4, uuid: 'unit-uuid-004', name: 'Gram',  type: 'weight', version: 1, created_at: null, updated_at: null },
];

// ---------------------------------------------------------------------------
// Display Levels  (display_levels_table)
// ---------------------------------------------------------------------------
export const DISPLAY_LEVELS = [
  { id: 1, uuid: 'dl-uuid-001', title: 'Main Menu',  location_id: 101, version: 1, created_at: null, updated_at: null },
  { id: 2, uuid: 'dl-uuid-002', title: 'Bar Menu',   location_id: 101, version: 1, created_at: null, updated_at: null },
  { id: 3, uuid: 'dl-uuid-003', title: 'Lunch Menu', location_id: 102, version: 1, created_at: null, updated_at: null },
];

// ---------------------------------------------------------------------------
// Categories  (categories_table)
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  {
    id: 1, uuid: 'cat-uuid-001', name: 'Burgers',
    parent_uuid: null, location_id: 101, version: 1,
    background_color: 'oklch(0.65 0.17 25)', text_color: '#ffffff',
    description: 'Classic and craft burgers', show_on_display: true,
    product_type_id: 1, department_uuid: null, tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: ['printer-uuid-001'],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 1,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2, uuid: 'cat-uuid-002', name: 'Pizza',
    parent_uuid: null, location_id: 101, version: 1,
    background_color: 'oklch(0.70 0.15 70)', text_color: '#ffffff',
    description: 'Stone-baked pizzas', show_on_display: true,
    product_type_id: 1, department_uuid: null, tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: ['printer-uuid-001'],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 2,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 3, uuid: 'cat-uuid-003', name: 'Coffee',
    parent_uuid: null, location_id: 102, version: 1,
    background_color: 'oklch(0.55 0.10 50)', text_color: '#ffffff',
    description: 'Espresso and filter coffee', show_on_display: true,
    product_type_id: 1, department_uuid: null, tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: ['printer-uuid-002'],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 1,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 4, uuid: 'cat-uuid-003-1', name: 'Espresso',
    parent_uuid: 'cat-uuid-003', location_id: 102, version: 1,
    background_color: 'oklch(0.55 0.10 50)', text_color: '#ffffff',
    description: null, show_on_display: true,
    product_type_id: 1, department_uuid: null, tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: ['printer-uuid-002'],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 1,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 5, uuid: 'cat-uuid-004', name: 'Beverages',
    parent_uuid: null, location_id: 101, version: 1,
    background_color: 'oklch(0.65 0.14 200)', text_color: '#ffffff',
    description: 'Soft drinks and sparkling water', show_on_display: true,
    product_type_id: 1, department_uuid: null, tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: [],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 3,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 6, uuid: 'cat-uuid-005', name: 'Apparel',
    parent_uuid: null, location_id: 103, version: 1,
    background_color: 'oklch(0.45 0.05 280)', text_color: '#ffffff',
    description: 'Branded clothing', show_on_display: true,
    product_type_id: 2, department_uuid: null, tax_uuid: 'tax-uuid-002',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: [],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 1,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 7, uuid: 'cat-uuid-006', name: 'Accessories',
    parent_uuid: null, location_id: 103, version: 1,
    background_color: 'oklch(0.60 0.12 290)', text_color: '#ffffff',
    description: 'Branded accessories', show_on_display: true,
    product_type_id: 2, department_uuid: null, tax_uuid: 'tax-uuid-002',
    tax_type_uuid: null, product_cols: 4, font_size: null,
    button_width: null, button_height: null, reorder: null,
    age_restriction_id: null, printers: [],
    profit_margin: null, background_image_url: null,
    background_image_blurhash: null, index: 2,
    unit: null, name_embedding: null,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Products  (products_table)
// ---------------------------------------------------------------------------
export const PRODUCTS = [
  {
    id: 1024, uuid: 'prod-uuid-1024', name: 'Northwind Classic Burger',
    selling_price: 14.50, buying_price: 4.20, category_uuid: 'cat-uuid-001',
    barcode: 'BRG-CLS-001', plu_code: 'BRG001', location_id: 101,
    sale_channels: [{ id: 1 }, { id: 3 }, { id: 4 }],
    description: 'House beef patty, special sauce, brioche bun',
    is_active: true, featured: true, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 1025, uuid: 'prod-uuid-1025', name: 'Smashed Mushroom Burger',
    selling_price: 13.00, buying_price: 3.80, category_uuid: 'cat-uuid-001',
    barcode: 'BRG-VEG-002', plu_code: 'BRG002', location_id: 101,
    sale_channels: [{ id: 1 }, { id: 3 }],
    description: 'Portobello patty, pesto, sourdough bun',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 1026, uuid: 'prod-uuid-1026', name: 'Double Stack Cheeseburger',
    selling_price: 17.50, buying_price: 5.40, category_uuid: 'cat-uuid-001',
    barcode: 'BRG-DBL-003', plu_code: 'BRG003', location_id: 101,
    sale_channels: [{ id: 1 }, { id: 3 }, { id: 4 }],
    description: 'Double smash patty, American cheese, pickles',
    is_active: true, featured: true, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 2031, uuid: 'prod-uuid-2031', name: 'Oat Milk Latte',
    selling_price: 5.75, buying_price: 1.20, category_uuid: 'cat-uuid-003-1',
    barcode: 'CFE-LAT-001', plu_code: 'CFE001', location_id: 102,
    sale_channels: [{ id: 1 }, { id: 2 }, { id: 4 }],
    description: 'Double shot espresso with oat milk',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-003', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 2032, uuid: 'prod-uuid-2032', name: 'Single-origin Americano',
    selling_price: 4.50, buying_price: 0.85, category_uuid: 'cat-uuid-003-1',
    barcode: 'CFE-AME-002', plu_code: 'CFE002', location_id: 102,
    sale_channels: [{ id: 1 }, { id: 2 }],
    description: 'Lungo over cold water, Ethiopian single origin',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-003', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 3014, uuid: 'prod-uuid-3014', name: 'Margherita Pizza',
    selling_price: 18.00, buying_price: 5.10, category_uuid: 'cat-uuid-002',
    barcode: 'PZA-MAR-001', plu_code: 'PZA001', location_id: 101,
    sale_channels: [{ id: 1 }, { id: 3 }],
    description: 'San Marzano tomato, buffalo mozzarella, fresh basil',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 3015, uuid: 'prod-uuid-3015', name: 'Pepperoni Pizza',
    selling_price: 19.50, buying_price: 5.60, category_uuid: 'cat-uuid-002',
    barcode: 'PZA-PEP-002', plu_code: 'PZA002', location_id: 101,
    sale_channels: [{ id: 1 }, { id: 3 }],
    description: 'Classic pepperoni, house tomato sauce',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    product_attribute_size: null, product_attribute_colour: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 4001, uuid: 'prod-uuid-4001', name: 'Heritage Tee — Black',
    selling_price: 38.00, buying_price: 12.40, category_uuid: 'cat-uuid-005',
    barcode: 'APP-TEE-BLK', plu_code: 'APP001', location_id: 103,
    sale_channels: [{ id: 6 }],
    description: '100% organic cotton, slim fit',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 2, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-002',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    product_attribute_size: 'M', product_attribute_colour: 'Black',
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 4003, uuid: 'prod-uuid-4003', name: 'Embroidered Cap',
    selling_price: 28.00, buying_price: 7.20, category_uuid: 'cat-uuid-006',
    barcode: 'APP-CAP-001', plu_code: 'APP003', location_id: 103,
    sale_channels: [{ id: 6 }],
    description: 'Structured 6-panel, embroidered logo',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 2, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-002',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    product_attribute_size: null, product_attribute_colour: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
  {
    id: 5010, uuid: 'prod-uuid-5010', name: 'Coke (can)',
    selling_price: 2.75, buying_price: 0.55, category_uuid: 'cat-uuid-004',
    barcode: 'BEV-COK-001', plu_code: 'BEV001', location_id: 101,
    sale_channels: [{ id: 1 }, { id: 3 }, { id: 4 }],
    description: '330ml classic Coca-Cola',
    is_active: true, featured: false, show_on_display: true,
    product_type_id: 1, unit_uuid: 'unit-uuid-001', tax_uuid: 'tax-uuid-001',
    tax_type_uuid: null, promotion_uuid: null, image_name: null,
    image_blurhash: null, background_color: null, text_color: null,
    parent_uuid: null, merge: false, open_price: false, weight: false,
    custom_name: false, custom_product: false, is_pop_on: false,
    profit_margin: null, age_restriction_id: null, pop_note_id: null,
    group_uuid: null, brand_uuid: null, department_uuid: null,
    product_attribute_size: null, product_attribute_colour: null,
    version: 1, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null, expiry_date: null, serial_number: null, imei_number: null,
    gallery_id: null, gallery_uuid: null, button_width: null, button_height: null,
    font_size: null, country_id: null, business_type_id: null, name_embedding: null,
  },
];

// ---------------------------------------------------------------------------
// Modifier Groups  (modifier_groups_table)
// ---------------------------------------------------------------------------
export const MODIFIER_GROUPS = [
  {
    id: 1, uuid: 'mg-uuid-001', name: 'Cooking Preference',
    location_id: 101, department_uuid: null, version: 1,
    minimum: 1, maximum: 1, text_color: null, background_color: null,
    button_height: null, created_at: null, updated_at: null,
  },
  {
    id: 2, uuid: 'mg-uuid-002', name: 'Cheese Add-ons',
    location_id: 101, department_uuid: null, version: 1,
    minimum: 0, maximum: 3, text_color: null, background_color: null,
    button_height: null, created_at: null, updated_at: null,
  },
  {
    id: 3, uuid: 'mg-uuid-003', name: 'Milk Choice',
    location_id: 102, department_uuid: null, version: 1,
    minimum: 1, maximum: 1, text_color: null, background_color: null,
    button_height: null, created_at: null, updated_at: null,
  },
  {
    id: 4, uuid: 'mg-uuid-004', name: 'Espresso Shots',
    location_id: 102, department_uuid: null, version: 1,
    minimum: 0, maximum: 4, text_color: null, background_color: null,
    button_height: null, created_at: null, updated_at: null,
  },
  {
    id: 5, uuid: 'mg-uuid-005', name: 'Pizza Toppings',
    location_id: 101, department_uuid: null, version: 1,
    minimum: 0, maximum: 8, text_color: null, background_color: null,
    button_height: null, created_at: null, updated_at: null,
  },
  {
    id: 6, uuid: 'mg-uuid-006', name: 'Spice Level',
    location_id: 101, department_uuid: null, version: 1,
    minimum: 1, maximum: 1, text_color: null, background_color: null,
    button_height: null, created_at: null, updated_at: null,
  },
];

// Location modifiers (individual modifier items) linked to groups
export const LOCATION_MODIFIERS = [
  { id: 1, uuid: 'lm-uuid-001', name: 'Rare',          base_price: 0,    cost_price: 0,    location_id: 101, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 2, uuid: 'lm-uuid-002', name: 'Medium-rare',   base_price: 0,    cost_price: 0,    location_id: 101, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 3, uuid: 'lm-uuid-003', name: 'Medium',        base_price: 0,    cost_price: 0,    location_id: 101, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 4, uuid: 'lm-uuid-004', name: 'American +$1',  base_price: 1.00, cost_price: 0.30, location_id: 101, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 5, uuid: 'lm-uuid-005', name: 'Cheddar +$1.50',base_price: 1.50, cost_price: 0.45, location_id: 101, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 6, uuid: 'lm-uuid-006', name: 'Oat +$0.75',    base_price: 0.75, cost_price: 0.20, location_id: 102, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 7, uuid: 'lm-uuid-007', name: 'Whole',         base_price: 0,    cost_price: 0,    location_id: 102, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
  { id: 8, uuid: 'lm-uuid-008', name: 'Mushroom +$2',  base_price: 2.00, cost_price: 0.60, location_id: 101, description: null, open_price: false, custom_name: false, merge: false, tax_uuid: null, tax_type_uuid: null, version: 1, created_at: null, updated_at: null },
];

// ---------------------------------------------------------------------------
// Staffs  (staffs_table)
// ---------------------------------------------------------------------------
export const STAFFS = [
  {
    id: 1, uuid: 'staff-uuid-001', number: 'EMP-001',
    first_name: 'Maya', last_name: 'Chen',
    email: 'maya@northwind.co', phone: '+1 212-555-0101',
    role_uuid: 'role-uuid-admin', location_id: 101, merchant_id: 1,
    is_active: true, is_quick_login: false, is_logout_after_sale: false,
    is_cash_drawer: true, is_super_user: true, is_training_staff: false,
    is_show_driver: false, is_waiter: false, password: null, pin: '1234',
    is_engineer: false, version: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2, uuid: 'staff-uuid-002', number: 'EMP-002',
    first_name: 'Diego', last_name: 'Ramirez',
    email: 'diego@northwind.co', phone: '+1 718-555-0122',
    role_uuid: 'role-uuid-manager', location_id: 102, merchant_id: 1,
    is_active: true, is_quick_login: true, is_logout_after_sale: false,
    is_cash_drawer: true, is_super_user: false, is_training_staff: false,
    is_show_driver: false, is_waiter: false, password: null, pin: '5678',
    is_engineer: false, version: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 3, uuid: 'staff-uuid-003', number: 'EMP-003',
    first_name: 'Priya', last_name: 'Patel',
    email: 'priya@northwind.co', phone: '+1 212-555-0133',
    role_uuid: 'role-uuid-cashier', location_id: 101, merchant_id: 1,
    is_active: true, is_quick_login: true, is_logout_after_sale: true,
    is_cash_drawer: false, is_super_user: false, is_training_staff: false,
    is_show_driver: false, is_waiter: false, password: null, pin: '2468',
    is_engineer: false, version: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 4, uuid: 'staff-uuid-004', number: 'EMP-004',
    first_name: 'Sara', last_name: 'Lindqvist',
    email: 'sara@northwind.co', phone: '+1 212-555-0105',
    role_uuid: 'role-uuid-waiter', location_id: 101, merchant_id: 1,
    is_active: true, is_quick_login: true, is_logout_after_sale: true,
    is_cash_drawer: false, is_super_user: false, is_training_staff: false,
    is_show_driver: false, is_waiter: true, password: null, pin: '1357',
    is_engineer: false, version: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 5, uuid: 'staff-uuid-005', number: 'EMP-005',
    first_name: 'Ahmed', last_name: 'Hassan',
    email: 'ahmed@northwind.co', phone: '+1 312-555-0155',
    role_uuid: 'role-uuid-manager', location_id: 103, merchant_id: 2,
    is_active: true, is_quick_login: false, is_logout_after_sale: false,
    is_cash_drawer: true, is_super_user: false, is_training_staff: false,
    is_show_driver: false, is_waiter: false, password: null, pin: '9876',
    is_engineer: false, version: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Terminals  (terminal_table)
// ---------------------------------------------------------------------------
export const TERMINALS = [
  {
    id: 1, uuid: 'term-uuid-001', name: 'Front Counter A',
    location_id: 101, terminal_id: 'TID-1001', local_id: 1,
    ip_address: '10.0.4.21', device_name: 'iPad Pro 12.9"',
    device_os: 'iPadOS 17', device_os_id: null, device_type_uuid: 'dtype-ipad',
    default_printer_uuid: 'printer-uuid-001', pos_theme_uuid: null,
    suspend: false, is_online: true, terminal_status_table_id: 1,
    device_id: null, device_activation_token_uuid: null,
    version: 1, created_at: null, updated_at: null,
  },
  {
    id: 2, uuid: 'term-uuid-002', name: 'Bar Station',
    location_id: 101, terminal_id: 'TID-1002', local_id: 2,
    ip_address: '10.0.4.23', device_name: 'iPad Air',
    device_os: 'iPadOS 17', device_os_id: null, device_type_uuid: 'dtype-ipad',
    default_printer_uuid: 'printer-uuid-002', pos_theme_uuid: null,
    suspend: false, is_online: true, terminal_status_table_id: 1,
    device_id: null, device_activation_token_uuid: null,
    version: 1, created_at: null, updated_at: null,
  },
  {
    id: 3, uuid: 'term-uuid-003', name: 'Counter 1',
    location_id: 102, terminal_id: 'TID-1003', local_id: 3,
    ip_address: '10.0.5.10', device_name: 'Square Register',
    device_os: 'Android 13', device_os_id: null, device_type_uuid: 'dtype-android',
    default_printer_uuid: 'printer-uuid-003', pos_theme_uuid: null,
    suspend: false, is_online: true, terminal_status_table_id: 1,
    device_id: null, device_activation_token_uuid: null,
    version: 1, created_at: null, updated_at: null,
  },
  {
    id: 4, uuid: 'term-uuid-004', name: 'Drive-thru',
    location_id: 103, terminal_id: 'TID-1004', local_id: 4,
    ip_address: '10.2.1.14', device_name: 'Toast Go 2',
    device_os: 'Android 12', device_os_id: null, device_type_uuid: 'dtype-android',
    default_printer_uuid: 'printer-uuid-004', pos_theme_uuid: null,
    suspend: false, is_online: true, terminal_status_table_id: 1,
    device_id: null, device_activation_token_uuid: null,
    version: 1, created_at: null, updated_at: null,
  },
  {
    id: 5, uuid: 'term-uuid-005', name: 'Patio Tablet',
    location_id: 101, terminal_id: 'TID-1005', local_id: 5,
    ip_address: '10.0.4.30', device_name: 'iPad Mini',
    device_os: 'iPadOS 16', device_os_id: null, device_type_uuid: 'dtype-ipad',
    default_printer_uuid: null, pos_theme_uuid: null,
    suspend: false, is_online: false, terminal_status_table_id: 3,
    device_id: null, device_activation_token_uuid: null,
    version: 1, created_at: null, updated_at: null,
  },
];

// ---------------------------------------------------------------------------
// Customers  (customers_table)
// ---------------------------------------------------------------------------
export const CUSTOMERS = [
  {
    id: 1, uuid: 'cust-uuid-001',
    first_name: 'Amelia', last_name: 'Thornton',
    email: 'amelia@example.com', phone: '+1 212-555-1001',
    zip_or_postal_code: '10012', building_number: '45', street: 'Spring St',
    city: 'New York', customer_type_id: 1, location_id: 101,
    country_id: 1, is_default: true, custom_tier_uuid: 'tier-uuid-platinum',
    version: 1, created_at: '2023-06-15T00:00:00.000Z',
    updated_at: '2024-03-10T00:00:00.000Z', operation_at: null,
  },
  {
    id: 2, uuid: 'cust-uuid-002',
    first_name: 'Luca', last_name: 'Moretti',
    email: 'luca@example.com', phone: '+1 718-555-2002',
    zip_or_postal_code: '11201', building_number: '88', street: 'Atlantic Ave',
    city: 'Brooklyn', customer_type_id: 1, location_id: 102,
    country_id: 1, is_default: false, custom_tier_uuid: 'tier-uuid-gold',
    version: 1, created_at: '2023-09-20T00:00:00.000Z',
    updated_at: '2024-02-28T00:00:00.000Z', operation_at: null,
  },
  {
    id: 3, uuid: 'cust-uuid-003',
    first_name: 'Yara', last_name: 'Hassan',
    email: 'yara@example.com', phone: '+1 312-555-3003',
    zip_or_postal_code: '60661', building_number: '450', street: 'W Fulton Market',
    city: 'Chicago', customer_type_id: 1, location_id: 103,
    country_id: 1, is_default: false, custom_tier_uuid: 'tier-uuid-gold',
    version: 1, created_at: '2023-11-05T00:00:00.000Z',
    updated_at: '2024-04-01T00:00:00.000Z', operation_at: null,
  },
  {
    id: 4, uuid: 'cust-uuid-004',
    first_name: 'Marcus', last_name: 'Webb',
    email: 'marcus@example.com', phone: '+1 617-555-4004',
    zip_or_postal_code: '02210', building_number: '200', street: 'Pier 4 Blvd',
    city: 'Boston', customer_type_id: 1, location_id: 101,
    country_id: 1, is_default: false, custom_tier_uuid: 'tier-uuid-silver',
    version: 1, created_at: '2024-01-12T00:00:00.000Z',
    updated_at: '2024-04-10T00:00:00.000Z', operation_at: null,
  },
  {
    id: 5, uuid: 'cust-uuid-005',
    first_name: 'Ingrid', last_name: 'Svensson',
    email: 'ingrid@example.com', phone: '+1 212-555-5005',
    zip_or_postal_code: '10012', building_number: '12', street: 'Mercer St',
    city: 'New York', customer_type_id: 2, location_id: 101,
    country_id: 1, is_default: false, custom_tier_uuid: 'tier-uuid-silver',
    version: 1, created_at: '2024-02-18T00:00:00.000Z',
    updated_at: '2024-04-20T00:00:00.000Z', operation_at: null,
  },
  {
    id: 6, uuid: 'cust-uuid-006',
    first_name: 'Omar', last_name: 'Farooq',
    email: 'omar@example.com', phone: '+1 415-555-6006',
    zip_or_postal_code: '94107', building_number: '1', street: 'Market St',
    city: 'San Francisco', customer_type_id: 1, location_id: 101,
    country_id: 1, is_default: false, custom_tier_uuid: 'tier-uuid-bronze',
    version: 1, created_at: '2024-03-22T00:00:00.000Z',
    updated_at: '2024-04-25T00:00:00.000Z', operation_at: null,
  },
];

// ---------------------------------------------------------------------------
// Printers  (printers_table)
// ---------------------------------------------------------------------------
export const PRINTERS = [
  {
    id: 1, uuid: 'printer-uuid-001', name: 'Kitchen — Hot Line',
    description: 'Main kitchen printer for hot food', printer_type: 'kitchen',
    hardware_name: 'EPSON-TM82-A', hardware_type: 'network',
    receipt_template: 'kitchen_default', is_enabled: true, is_default: true,
    paper_width: 80, auto_cut: true, open_drawer: false, copies: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: null,
  },
  {
    id: 2, uuid: 'printer-uuid-002', name: 'Bar Receipt',
    description: 'Receipt printer at bar station', printer_type: 'receipt',
    hardware_name: 'STAR-TSP143', hardware_type: 'usb',
    receipt_template: 'default', is_enabled: true, is_default: false,
    paper_width: 80, auto_cut: true, open_drawer: true, copies: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: null,
  },
  {
    id: 3, uuid: 'printer-uuid-003', name: 'Counter Receipt',
    description: 'Front counter receipt printer', printer_type: 'receipt',
    hardware_name: 'EPSON-TM30', hardware_type: 'network',
    receipt_template: 'default', is_enabled: true, is_default: true,
    paper_width: 58, auto_cut: true, open_drawer: true, copies: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: null,
  },
  {
    id: 4, uuid: 'printer-uuid-004', name: 'Drive-thru Label',
    description: 'Label printer for drive-thru bags', printer_type: 'label',
    hardware_name: 'BIXOLON-SLP', hardware_type: 'usb',
    receipt_template: 'label_default', is_enabled: true, is_default: false,
    paper_width: 58, auto_cut: false, open_drawer: false, copies: 1,
    created_at: '2024-01-01T00:00:00.000Z', updated_at: null,
  },
];

// ---------------------------------------------------------------------------
// Discounts  (discounts_table)
// ---------------------------------------------------------------------------
export const DISCOUNTS = [
  { id: 1, uuid: 'disc-uuid-001', name: 'Staff 20%',    amount: 20, discount_type_id: 1, location_id: 101, version: 1, created_at: null, updated_at: null },
  { id: 2, uuid: 'disc-uuid-002', name: 'Happy Hour',   amount: 15, discount_type_id: 1, location_id: 101, version: 1, created_at: null, updated_at: null },
  { id: 3, uuid: 'disc-uuid-003', name: 'Fixed £5 off', amount: 5,  discount_type_id: 2, location_id: 102, version: 1, created_at: null, updated_at: null },
  { id: 4, uuid: 'disc-uuid-004', name: 'Manager',      amount: 100,discount_type_id: 1, location_id: 101, version: 1, created_at: null, updated_at: null },
];

// ---------------------------------------------------------------------------
// Locations and Sale Channels junction  (locations_and_sale_channels_table)
// ---------------------------------------------------------------------------
export const LOCATIONS_AND_SALE_CHANNELS = [
  { id: 1, uuid: 'lasc-uuid-001', location_id: 101, sale_channel_id: 1, sale_channel_mode_id: 1, name: 'Dine-in SoHo',    is_active: true, version: 1, start_duration: null, end_duration: null, hse_partner_order_percentage_uuid: null, hse_partner_service_charges_uuid: null, subscription_uuid: null, created_at: null, updated_at: null },
  { id: 2, uuid: 'lasc-uuid-002', location_id: 101, sale_channel_id: 2, sale_channel_mode_id: 1, name: 'Takeaway SoHo',   is_active: true, version: 1, start_duration: null, end_duration: null, hse_partner_order_percentage_uuid: null, hse_partner_service_charges_uuid: null, subscription_uuid: null, created_at: null, updated_at: null },
  { id: 3, uuid: 'lasc-uuid-003', location_id: 101, sale_channel_id: 3, sale_channel_mode_id: 1, name: 'Delivery SoHo',   is_active: true, version: 1, start_duration: null, end_duration: null, hse_partner_order_percentage_uuid: null, hse_partner_service_charges_uuid: null, subscription_uuid: null, created_at: null, updated_at: null },
  { id: 4, uuid: 'lasc-uuid-004', location_id: 102, sale_channel_id: 1, sale_channel_mode_id: 1, name: 'Dine-in WV',      is_active: true, version: 1, start_duration: null, end_duration: null, hse_partner_order_percentage_uuid: null, hse_partner_service_charges_uuid: null, subscription_uuid: null, created_at: null, updated_at: null },
  { id: 5, uuid: 'lasc-uuid-005', location_id: 103, sale_channel_id: 5, sale_channel_mode_id: 1, name: 'Drive-thru CHI',  is_active: true, version: 1, start_duration: null, end_duration: null, hse_partner_order_percentage_uuid: null, hse_partner_service_charges_uuid: null, subscription_uuid: null, created_at: null, updated_at: null },
];

// ---------------------------------------------------------------------------
// Ext Orders  (ext_orders_table)
// ---------------------------------------------------------------------------
export const EXT_ORDERS = [
  {
    id: 1, uuid: 'ord-uuid-10394', local_id: 10394,
    supabase_id: null, microservice_id: null,
    location_id: 101, terminal_id: 1,
    service_type: 'Table Service', sale_channel_type: 'dine_in',
    mode: 'dine_in', country: 'US', order_number: 10394,
    customer_uuid: null, last_status: 'preparing', discount: null,
    status_stages: [{ status: 'new', ts: '2024-05-10T13:00:00Z' }, { status: 'preparing', ts: '2024-05-10T13:02:00Z' }],
    ticket_status_stages: [],
    products: [
      { product_uuid: 'prod-uuid-1024', name: 'Northwind Classic Burger', qty: 1, unit_price: 14.50, modifiers: [{ uuid: 'lm-uuid-003', name: 'Medium', price: 0 }] },
      { product_uuid: 'prod-uuid-2032', name: 'Single-origin Americano', qty: 2, unit_price: 4.50, modifiers: [] },
    ],
    payments: [],
    version: 1, synced_at: null, deleted_at: null,
    ticket_status_timestamp: null, status_timestamp: '2024-05-10T13:02:00Z',
    operation_at: '2024-05-10T13:00:00Z',
    created_at: '2024-05-10T13:00:00Z', updated_at: '2024-05-10T13:02:00Z',
  },
  {
    id: 2, uuid: 'ord-uuid-10395', local_id: 10395,
    supabase_id: null, microservice_id: null,
    location_id: 101, terminal_id: 1,
    service_type: 'Counter', sale_channel_type: 'qr',
    mode: 'qr', country: 'US', order_number: 10395,
    customer_uuid: null, last_status: 'new', discount: null,
    status_stages: [{ status: 'new', ts: '2024-05-10T13:01:22Z' }],
    ticket_status_stages: [],
    products: [
      { product_uuid: 'prod-uuid-3014', name: 'Margherita Pizza', qty: 1, unit_price: 18.00, modifiers: [] },
      { product_uuid: 'prod-uuid-5010', name: 'Coke (can)', qty: 1, unit_price: 2.75, modifiers: [] },
    ],
    payments: [],
    version: 1, synced_at: null, deleted_at: null,
    ticket_status_timestamp: null, status_timestamp: '2024-05-10T13:01:22Z',
    operation_at: '2024-05-10T13:01:22Z',
    created_at: '2024-05-10T13:01:22Z', updated_at: '2024-05-10T13:01:22Z',
  },
  {
    id: 3, uuid: 'ord-uuid-10396', local_id: 10396,
    supabase_id: null, microservice_id: null,
    location_id: 101, terminal_id: 2,
    service_type: 'Table Service', sale_channel_type: 'dine_in',
    mode: 'dine_in', country: 'US', order_number: 10396,
    customer_uuid: 'cust-uuid-001', last_status: 'served', discount: null,
    status_stages: [
      { status: 'new', ts: '2024-05-10T12:46:00Z' },
      { status: 'preparing', ts: '2024-05-10T12:48:00Z' },
      { status: 'served', ts: '2024-05-10T13:00:00Z' },
    ],
    ticket_status_stages: [],
    products: [
      { product_uuid: 'prod-uuid-1026', name: 'Double Stack Cheeseburger', qty: 2, unit_price: 17.50, modifiers: [{ uuid: 'lm-uuid-001', name: 'Rare', price: 0 }] },
      { product_uuid: 'prod-uuid-3015', name: 'Pepperoni Pizza', qty: 1, unit_price: 19.50, modifiers: [] },
      { product_uuid: 'prod-uuid-5010', name: 'Coke (can)', qty: 4, unit_price: 2.75, modifiers: [] },
    ],
    payments: [{ method: 'card', amount: 128.00 }],
    version: 1, synced_at: null, deleted_at: null,
    ticket_status_timestamp: null, status_timestamp: '2024-05-10T13:00:00Z',
    operation_at: '2024-05-10T12:46:00Z',
    created_at: '2024-05-10T12:46:00Z', updated_at: '2024-05-10T13:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Daily Reports  (daily_reports_table)
// ---------------------------------------------------------------------------
export const DAILY_REPORTS = [
  {
    id: 1, uuid: 'dr-uuid-001', report_date: '2026-05-09',
    total_sales: 18420, total_cost: 5840, gross_profit: 12580, net_profit: 9200,
    total_orders: 284, total_items_sold: 712, average_order_value: 64.86,
    best_selling_product_uuid: 'prod-uuid-2031',
    best_selling_category_uuid: 'cat-uuid-003-1',
    hourly_breakdown: JSON.stringify([
      { h: '9', v: 8 }, { h: '10', v: 14 }, { h: '11', v: 22 }, { h: '12', v: 38 },
      { h: '13', v: 42 }, { h: '14', v: 31 }, { h: '15', v: 18 }, { h: '16', v: 21 },
      { h: '17', v: 28 }, { h: '18', v: 44 }, { h: '19', v: 52 }, { h: '20', v: 47 },
    ]),
    payment_methods: JSON.stringify([{ method: 'card', amount: 14200 }, { method: 'cash', amount: 4220 }]),
    service_types: JSON.stringify([{ type: 'dine_in', count: 142 }, { type: 'takeaway', count: 88 }, { type: 'delivery', count: 54 }]),
    location_id: '101',
    created_at: '2026-05-09T23:59:59.000Z',
  },
  {
    id: 2, uuid: 'dr-uuid-002', report_date: '2026-05-10',
    total_sales: 9840, total_cost: 2980, gross_profit: 6860, net_profit: 4900,
    total_orders: 152, total_items_sold: 389, average_order_value: 64.74,
    best_selling_product_uuid: 'prod-uuid-1024',
    best_selling_category_uuid: 'cat-uuid-001',
    hourly_breakdown: JSON.stringify([
      { h: '9', v: 4 }, { h: '10', v: 9 }, { h: '11', v: 16 }, { h: '12', v: 28 },
    ]),
    payment_methods: JSON.stringify([{ method: 'card', amount: 7800 }, { method: 'cash', amount: 2040 }]),
    service_types: JSON.stringify([{ type: 'dine_in', count: 76 }, { type: 'takeaway', count: 52 }, { type: 'delivery', count: 24 }]),
    location_id: '101',
    created_at: '2026-05-10T14:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Batch Reports  (batch_reports_table)
// ---------------------------------------------------------------------------
export const BATCH_REPORTS = [
  {
    id: 1, uuid: 'br-uuid-001', batch_name: 'Morning Shift',
    start_date: '2026-05-10T08:00:00.000Z', end_date: '2026-05-10T14:00:00.000Z',
    status: 'CLOSED', total_sales: 5240, total_cost: 1620,
    gross_profit: 3620, net_profit: 2800,
    total_orders: 84, total_items_sold: 212, location_id: '101', terminal_id: '1',
    category_breakdown: JSON.stringify([{ uuid: 'cat-uuid-001', name: 'Burgers', sales: 2100 }, { uuid: 'cat-uuid-003-1', name: 'Espresso', sales: 1840 }]),
    product_breakdown: null,
    payment_method_breakdown: JSON.stringify([{ method: 'card', amount: 4200 }, { method: 'cash', amount: 1040 }]),
    service_type_breakdown: null,
    created_at: '2026-05-10T08:00:00.000Z', updated_at: '2026-05-10T14:00:00.000Z',
    closed_at: '2026-05-10T14:01:00.000Z',
  },
  {
    id: 2, uuid: 'br-uuid-002', batch_name: 'Afternoon Shift',
    start_date: '2026-05-10T14:00:00.000Z', end_date: null,
    status: 'ACTIVE', total_sales: 4600, total_cost: 1360,
    gross_profit: 3240, net_profit: 2100,
    total_orders: 68, total_items_sold: 177, location_id: '101', terminal_id: '1',
    category_breakdown: null, product_breakdown: null,
    payment_method_breakdown: null, service_type_breakdown: null,
    created_at: '2026-05-10T14:00:00.000Z', updated_at: '2026-05-10T17:30:00.000Z',
    closed_at: null,
  },
];

// ---------------------------------------------------------------------------
// Promotions  (promotions_table)
// ---------------------------------------------------------------------------
export const PROMOTIONS = [
  {
    id: 'promo-uuid-001', name: 'Happy Hour 15%',
    description: 'All drinks 15% off 3pm–6pm',
    type: 1, applicable_product_ids: 'cat-uuid-003-1,cat-uuid-004',
    min_quantity: 1, discount_percent: 15, discount_amount: null,
    free_product_id: null, free_product_qty: null, discount_on_items: null,
    is_active: true, start_date: '2026-01-01T15:00:00Z', end_date: '2026-12-31T18:00:00Z',
    priority: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    is_synced: false,
  },
  {
    id: 'promo-uuid-002', name: 'Burger + Drink Combo',
    description: 'Any burger + any drink save $2',
    type: 2, applicable_product_ids: 'cat-uuid-001,cat-uuid-004',
    min_quantity: 2, discount_percent: null, discount_amount: 2.00,
    free_product_id: null, free_product_qty: null, discount_on_items: 2,
    is_active: true, start_date: null, end_date: null,
    priority: 2, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    is_synced: false,
  },
];

// ---------------------------------------------------------------------------
// Dashboard KPIs and live summary (derived / computed — not a DB table)
// ---------------------------------------------------------------------------
export const DASHBOARD = {
  merchant: { name: 'Northwind Hospitality', plan: 'Enterprise', location_count: 3, terminal_count: 5 },
  kpis: [
    { label: 'Gross Sales',  value: 184293, currency: '$', delta: '+12.4%', dir: 'up',   spark: [12, 18, 14, 22, 19, 25, 28, 24, 30, 33, 29, 38] },
    { label: 'Orders',       value: 2847,   currency: null,delta: '+8.1%',  dir: 'up',   spark: [10, 14, 12, 18, 16, 20, 22, 21, 24, 26, 23, 28] },
    { label: 'Avg. Ticket',  value: 64.74,  currency: '$', delta: '+3.9%',  dir: 'up',   spark: [20, 21, 22, 21, 23, 24, 23, 25, 26, 25, 27, 28] },
    { label: 'Refunds',      value: 1247,   currency: '$', delta: '-22%',   dir: 'up',   spark: [30, 28, 26, 24, 25, 22, 20, 21, 18, 16, 15, 12] },
  ],
  channels: [
    { name: 'Dine-in',    value: 38, color: 'oklch(0.62 0.17 145)' },
    { name: 'Takeaway',   value: 24, color: 'oklch(0.65 0.14 200)' },
    { name: 'Delivery',   value: 22, color: 'oklch(0.70 0.15 70)'  },
    { name: 'QR Order',   value: 11, color: 'oklch(0.55 0.18 290)' },
    { name: 'Drive-thru', value:  5, color: 'oklch(0.60 0.18 25)'  },
  ],
  top_products: [
    { product_uuid: 'prod-uuid-2031', name: 'Oat Milk Latte',             sales: 482, revenue: 2772, share: 100 },
    { product_uuid: 'prod-uuid-1024', name: 'Northwind Classic Burger',   sales: 314, revenue: 4553, share: 65  },
    { product_uuid: 'prod-uuid-3014', name: 'Margherita Pizza',           sales: 198, revenue: 3564, share: 41  },
    { product_uuid: 'prod-uuid-2032', name: 'Single-origin Americano',    sales: 187, revenue:  794, share: 39  },
    { product_uuid: 'prod-uuid-4001', name: 'Heritage Tee — Black',       sales: 142, revenue: 5396, share: 29  },
    { product_uuid: 'prod-uuid-1026', name: 'Double Stack Cheeseburger',  sales: 124, revenue: 2170, share: 26  },
  ],
};

// ---------------------------------------------------------------------------
// Backward-compat DATA export (used by legacy screens)
// ---------------------------------------------------------------------------
export const DATA = {
  merchant:       DASHBOARD.merchant,
  kpis:           DASHBOARD.kpis,
  channels:       DASHBOARD.channels,
  topProducts:    DASHBOARD.top_products,
  products:       PRODUCTS,
  categories:     CATEGORIES,
  modifierGroups: MODIFIER_GROUPS,
  staff:          STAFFS,
  terminals:      TERMINALS,
  liveOrders:     EXT_ORDERS.map(o => ({
    id:        `#${o.order_number}`,
    items:     o.products.reduce((s, p) => s + p.qty, 0),
    total:     o.products.reduce((s, p) => s + p.qty * p.unit_price, 0),
    channel:   o.sale_channel_type,
    status:    o.last_status,
    placed:    '—',
    staff:     '—',
    table:     '—',
  })),
  locations:      LOCATIONS_AND_SALE_CHANNELS,
};

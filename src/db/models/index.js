// Model factory functions for all POS entities.
// Each factory returns a plain JS object with ALL columns defaulted — mirrors Flutter Drift models.
// Usage: const p = createProduct({ name: 'Burger', selling_price: 12.50 })

import { v4 as uuidv4 } from 'uuid';

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export const createProduct = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  deleted_at: null,
  version: null,
  buying_price: null,
  selling_price: 0,
  location_id: null,
  sale_channels: [],              // List<{ id, name, type }>
  name: '',
  category_uuid: null,
  barcode: null,
  merge: null,
  featured: null,
  description: null,
  background_color: null,
  text_color: null,
  button_width: null,
  button_height: null,
  font_size: null,
  custom_name: null,
  weight: null,
  open_price: null,
  show_on_display: null,
  promotion_uuid: null,
  product_type_id: null,
  parent_uuid: null,
  product_attribute_size: null,
  product_attribute_colour: null,
  plu_code: null,
  profit_margin: null,
  age_restriction_id: null,
  pop_note_id: null,
  country_id: null,
  business_type_id: null,
  imei_number: null,
  serial_number: null,
  expiry_date: null,
  is_active: true,
  is_pop_on: null,
  unit_uuid: null,
  group_uuid: null,
  brand_uuid: null,
  department_uuid: null,
  tax_type_uuid: null,
  tax_uuid: null,
  image_name: null,
  image_blurhash: null,
  gallery_id: null,
  gallery_uuid: null,
  custom_product: null,
  name_embedding: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------
export const createCategory = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  location_id: null,
  background_color: null,
  text_color: null,
  name: '',
  parent_uuid: null,
  button_height: null,
  button_width: null,
  font_size: null,
  description: null,
  show_on_display: null,
  product_cols: null,
  product_type_id: null,
  department_uuid: null,
  unit: null,
  reorder: null,
  age_restriction_id: null,
  printers: [],                   // List<printer_uuid>
  profit_margin: null,
  tax_uuid: null,
  tax_type_uuid: null,
  background_image_url: null,
  background_image_blurhash: null,
  index: null,
  name_embedding: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------
export const createCustomer = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  operation_at: null,
  version: null,
  first_name: null,
  last_name: null,
  email: null,
  phone: null,
  zip_or_postal_code: null,
  building_number: null,
  street: null,
  city: null,
  customer_type_id: null,
  location_id: null,
  country_id: null,
  is_default: null,
  custom_tier_uuid: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export const createStaff = (overrides = {}) => ({
  id: null,
  number: '',
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  merchant_id: null,
  role_uuid: '',
  location_id: null,
  is_active: null,
  is_quick_login: null,
  is_logout_after_sale: null,
  is_cash_drawer: null,
  is_super_user: null,
  is_training_staff: null,
  is_show_driver: null,
  is_waiter: null,
  password: null,
  pin: null,
  is_engineer: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------
export const createTerminal = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  local_id: null,
  name: null,
  location_id: null,
  terminal_id: null,
  pos_theme_uuid: null,
  default_printer_uuid: null,
  suspend: null,
  ip_address: null,
  device_id: null,
  device_activation_token_uuid: null,
  is_online: null,
  terminal_status_table_id: null,
  device_name: null,
  device_os: null,
  device_os_id: null,
  device_type_uuid: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// ModifierGroup
// ---------------------------------------------------------------------------
export const createModifierGroup = (overrides = {}) => ({
  id: null,
  created_at: now(),
  updated_at: now(),
  name: null,
  location_id: null,
  uuid: uuidv4(),
  department_uuid: null,
  version: null,
  minimum: 0,
  text_color: null,
  maximum: 1,
  background_color: null,
  button_height: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// LocationModifier  (individual modifier item within a group)
// ---------------------------------------------------------------------------
export const createLocationModifier = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  name: null,
  cost_price: null,
  description: null,
  open_price: null,
  custom_name: null,
  merge: null,
  location_id: null,
  base_price: null,
  tax_uuid: null,
  tax_type_uuid: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// SaleChannel
// ---------------------------------------------------------------------------
export const createSaleChannel = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: null,
  updated_at: null,
  version: null,
  name: null,
  type: null,
  description: null,
  is_active: null,
  logo: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// LocationAndSaleChannel  (junction)
// ---------------------------------------------------------------------------
export const createLocationAndSaleChannel = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: null,
  updated_at: null,
  version: null,
  location_id: null,
  sale_channel_id: null,
  sale_channel_mode_id: null,
  start_duration: null,
  end_duration: null,
  hse_partner_order_percentage_uuid: null,
  hse_partner_service_charges_uuid: null,
  subscription_uuid: null,
  name: null,
  is_active: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// ExtOrder
// ---------------------------------------------------------------------------
export const createExtOrder = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  local_id: null,
  supabase_id: null,
  microservice_id: null,
  location_id: null,
  terminal_id: null,
  service_type: null,
  sale_channel_type: null,
  created_at: now(),
  updated_at: now(),
  version: null,
  synced_at: null,
  deleted_at: null,
  ticket_status_timestamp: null,
  status_timestamp: null,
  operation_at: null,
  mode: null,
  country: null,
  order_number: null,
  customer_uuid: null,
  last_status: null,
  discount: null,
  status_stages: [],
  ticket_status_stages: [],
  products: [],                   // List<{ product_uuid, name, qty, unit_price, modifiers[] }>
  payments: [],                   // List<{ method, amount }>
  ...overrides,
});

// ---------------------------------------------------------------------------
// Discount
// ---------------------------------------------------------------------------
export const createDiscount = (overrides = {}) => ({
  id: null,
  created_at: now(),
  updated_at: now(),
  uuid: uuidv4(),
  version: null,
  name: null,
  amount: null,
  discount_type_id: null,
  location_id: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Printer
// ---------------------------------------------------------------------------
export const createPrinter = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  name: '',
  description: null,
  printer_type: 'receipt',       // receipt | kitchen | invoice | label | ticket
  hardware_name: '',
  hardware_type: 'usb',          // usb | bluetooth | network | sunmi
  receipt_template: 'default',
  is_enabled: true,
  is_default: false,
  paper_width: 80,
  auto_cut: true,
  open_drawer: false,
  copies: 1,
  created_at: now(),
  updated_at: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// PrintJob
// ---------------------------------------------------------------------------
export const createPrintJob = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  order_uuid: '',
  printer_config_uuid: '',
  hardware_printer_address: null,
  job_type: 'receipt',
  status: 'pending',             // pending | processing | completed | failed | cancelled | retrying
  priority: 'normal',            // low | normal | high | urgent
  payload: '',
  retry_count: 0,
  max_retries: 3,
  error_message: null,
  created_at: now(),
  processed_at: null,
  completed_at: null,
  scheduled_at: null,
  category_uuid: null,
  products: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------
export const createUnit = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: null,
  updated_at: null,
  version: 0,
  name: '',
  type: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export const createService = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  name: null,
  service_type_id: null,
  icon_data: null,
  location_id: null,
  display_level_uuid: null,
  sale_channels: [],
  serve_min_time: null,
  serve_max_time: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// ServiceType
// ---------------------------------------------------------------------------
export const createServiceType = (overrides = {}) => ({
  id: null,
  created_at: now(),
  update_at: now(),
  local_id: null,
  uuid: uuidv4(),
  version: null,
  name: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// DisplayLevel
// ---------------------------------------------------------------------------
export const createDisplayLevel = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  title: null,
  location_id: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// DisplayLevelCategory
// ---------------------------------------------------------------------------
export const createDisplayLevelCategory = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  category_uuid: null,
  sub_category_uuid: null,
  display_level_uuid: null,
  product_uuid: null,
  location_id: null,
  order_number: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// MealDealGroup
// ---------------------------------------------------------------------------
export const createMealDealGroup = (overrides = {}) => ({
  id: null,
  created_at: now(),
  updated_at: now(),
  uuid: uuidv4(),
  version: null,
  name: null,
  location_id: null,
  product_uuid: null,
  minimum: null,
  maximum: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// MealDealJunction
// ---------------------------------------------------------------------------
export const createMealDealJunction = (overrides = {}) => ({
  id: null,
  created_at: now(),
  updated_at: now(),
  location_id: null,
  uuid: uuidv4(),
  version: null,
  meal_deal_group_uuid: null,
  product_uuid: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// TerminalServiceJunction
// ---------------------------------------------------------------------------
export const createTerminalServiceJunction = (overrides = {}) => ({
  id: null,
  created_at: null,
  updated_at: null,
  uuid: uuidv4(),
  version: null,
  terminal_id: null,
  service_uuid: null,
  display_level_uuid: null,
  location_id: null,
  sale_channel_id: null,
  is_available: null,
  is_default: null,
  is_active: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// ModifierDisplayLevelsLocation
// ---------------------------------------------------------------------------
export const createModifierDisplayLevelsLocation = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: now(),
  updated_at: now(),
  version: null,
  modifier_group_uuid: null,
  product_uuid: null,
  location_id: null,
  sale_price: null,
  modifier_uuid: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------
export const createPromotion = (overrides = {}) => ({
  id: uuidv4(),
  name: '',
  description: null,
  type: 0,
  applicable_product_ids: '',
  min_quantity: 1,
  discount_percent: null,
  discount_amount: null,
  free_product_id: null,
  free_product_qty: null,
  discount_on_items: null,
  is_active: true,
  start_date: null,
  end_date: null,
  priority: 0,
  created_at: now(),
  updated_at: now(),
  is_synced: false,
  ...overrides,
});

// ---------------------------------------------------------------------------
// DailyReport
// ---------------------------------------------------------------------------
export const createDailyReport = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  report_date: new Date().toISOString().slice(0, 10),
  total_sales: 0,
  total_cost: 0,
  gross_profit: 0,
  net_profit: 0,
  total_orders: 0,
  total_items_sold: 0,
  average_order_value: 0,
  best_selling_product_uuid: null,
  best_selling_category_uuid: null,
  hourly_breakdown: null,
  payment_methods: null,
  service_types: null,
  location_id: null,
  created_at: now(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// BatchReport
// ---------------------------------------------------------------------------
export const createBatchReport = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  batch_name: '',
  start_date: now(),
  end_date: null,
  status: 'ACTIVE',              // ACTIVE | CLOSED
  total_sales: 0,
  total_cost: 0,
  gross_profit: 0,
  net_profit: 0,
  total_orders: 0,
  total_items_sold: 0,
  location_id: null,
  terminal_id: null,
  category_breakdown: null,
  product_breakdown: null,
  payment_method_breakdown: null,
  service_type_breakdown: null,
  created_at: now(),
  updated_at: now(),
  closed_at: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// SyncStatus
// ---------------------------------------------------------------------------
export const createSyncStatus = (overrides = {}) => ({
  id: null,
  last_sync_time: Date.now(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// EXT Query (sync queue entry)
// ---------------------------------------------------------------------------
export const createExtQuery = (overrides = {}) => ({
  id: null,
  uuid: uuidv4(),
  created_at: null,
  operation_at: null,
  updated_at: null,
  deleted_at: null,
  synced_at: null,
  version: null,
  supabase_id: null,
  microservice_id: null,
  entity: null,
  operation: null,
  entity_id: null,
  location_id: null,
  retry_count: null,
  is_defective: null,
  error_message: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns "First Last" from a staff or customer object */
export const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ') || '—';

/** Derives stock status string from product fields */
export const productStockStatus = (product) => {
  if (!product.is_active) return 'inactive';
  return 'active';
};

/** Formats selling_price to currency string */
export const fmtPrice = (val, currency = '$') =>
  val == null ? '—' : `${currency}${Number(val).toFixed(2)}`;

/** Computes gross margin % from buying_price and selling_price */
export const grossMargin = (product) => {
  const { buying_price, selling_price } = product;
  if (!selling_price) return null;
  if (!buying_price) return 100;
  return Math.round(((selling_price - buying_price) / selling_price) * 100);
};

// Smart POS — sample data (mixed restaurant + retail)
const DATA = {
  merchants: [
    { id: 'M-001', name: 'Northwind Hospitality', email: 'admin@northwind.co', phone: '+1 212-555-0100', plan: 'Enterprise' },
    { id: 'M-002', name: 'Blue Bottle Group', email: 'ops@bluebottle.com', phone: '+1 415-555-0200', plan: 'Premium' },
    { id: 'M-003', name: 'Arbaz Merchant', email: 'arbaz@pos.com', phone: '+92 300-1234567', plan: 'Standard' },
  ],
  kpis: [
    { label: 'Gross Sales', value: 184293, currency: '$', delta: '+12.4%', dir: 'up', spark: [12, 18, 14, 22, 19, 25, 28, 24, 30, 33, 29, 38] },
    { label: 'Orders', value: 2847, delta: '+8.1%', dir: 'up', spark: [10, 14, 12, 18, 16, 20, 22, 21, 24, 26, 23, 28] },
    { label: 'Avg. Ticket', value: 64.74, currency: '$', delta: '+3.9%', dir: 'up', spark: [20, 21, 22, 21, 23, 24, 23, 25, 26, 25, 27, 28] },
    { label: 'Refunds', value: 1247, currency: '$', delta: '-22%', dir: 'up', spark: [30, 28, 26, 24, 25, 22, 20, 21, 18, 16, 15, 12] },
  ],
  channels: [
    { name: 'Dine-in', value: 38, color: 'oklch(0.62 0.17 145)' },
    { name: 'Takeaway', value: 24, color: 'oklch(0.65 0.14 200)' },
    { name: 'Delivery', value: 22, color: 'oklch(0.70 0.15 70)' },
    { name: 'QR Order', value: 11, color: 'oklch(0.55 0.18 290)' },
    { name: 'Drive-thru', value: 5, color: 'oklch(0.60 0.18 25)' },
  ],
  locations: [
    { id: 'L-001', merchant_id: 'M-001', name: 'Flagship — SoHo', code: 'NYC-01', city: 'New York, NY', status: 'open', terminals: 8, staff: 24, sales: 28430, channels: ['Dine-in', 'Takeaway', 'Delivery'], type: 'Restaurant', email: 'soho@northwind.co', phone: '+1 212-555-0101', website: 'https://northwind.co/soho', logo: '', address: '123 Spring St, New York, NY 10012', country: 'United States' },
    { id: 'L-002', merchant_id: 'M-001', name: 'Brooklyn Heights', code: 'NYC-02', city: 'Brooklyn, NY', status: 'open', terminals: 4, staff: 12, sales: 14820, channels: ['Dine-in', 'QR'], type: 'Cafe', email: 'brooklyn@northwind.co', phone: '+1 718-555-0122', website: 'https://northwind.co/brooklyn', logo: '', address: '88 Atlantic Ave, Brooklyn, NY 11201', country: 'United States' },
    { id: 'L-003', merchant_id: 'M-001', name: 'Williamsburg Pop-up', code: 'NYC-03', city: 'Brooklyn, NY', status: 'closed', terminals: 2, staff: 6, sales: 4210, channels: ['Takeaway'], type: 'Cafe', email: 'williamsburg@northwind.co', phone: '+1 718-555-0133', website: 'https://northwind.co/williamsburg', logo: '', address: '45 Kent Ave, Brooklyn, NY 11249', country: 'United States' },
    { id: 'L-004', merchant_id: 'M-002', name: 'SF Ferry Building', code: 'SFO-01', city: 'San Francisco, CA', status: 'open', terminals: 3, staff: 9, sales: 15400, channels: ['Dine-in', 'Takeaway'], type: 'Cafe', email: 'ferry@bluebottle.com', phone: '+1 415-555-0201', website: 'https://bluebottle.com/ferry', logo: '', address: '1 Ferry Building, San Francisco, CA 94111', country: 'United States' },
    { id: 'L-005', merchant_id: 'M-003', name: 'Arbaz Outlet', code: 'KHI-01', city: 'Karachi, PK', status: 'open', terminals: 2, staff: 4, sales: 5000, channels: ['Takeaway', 'Delivery'], type: 'Retail', email: 'outlet@arbaz.com', phone: '+92 300-1112233', website: 'https://arbaz.com', logo: '', address: 'DHA Phase 6, Karachi', country: 'Pakistan' },
  ],
  products: [
    { id: 'P-1024', sku: 'BRG-CLS-001', name: 'Northwind Classic Burger', category: 'Burgers', price: 14.50, cost: 4.20, stock: 142, status: 'active', channels: ['Dine-in', 'Delivery', 'QR'], modifiers: 4, type: 'Restaurant' },
    { id: 'P-1025', sku: 'BRG-VEG-002', name: 'Smashed Mushroom Burger', category: 'Burgers', price: 13.00, cost: 3.80, stock: 88, status: 'active', channels: ['Dine-in', 'Delivery'], modifiers: 4, type: 'Restaurant' },
    { id: 'P-1026', sku: 'BRG-DBL-003', name: 'Double Stack Cheeseburger', price: 17.50, cost: 5.40, stock: 64, status: 'active', channels: ['Dine-in', 'Delivery', 'QR'], modifiers: 5, type: 'Restaurant' },
    { id: 'P-2031', sku: 'CFE-LAT-001', name: 'Oat Milk Latte', category: 'Coffee', price: 5.75, cost: 1.20, stock: 999, status: 'active', channels: ['Dine-in', 'Takeaway', 'QR'], modifiers: 6, type: 'Cafe' },
  ],
  modifierGroups: [
    { id: 'MG-001', name: 'Cooking Preference', min: 1, max: 1, required: true, items: ['Rare', 'Medium-rare', 'Medium', 'Medium-well', 'Well done'], linked: 6 },
    { id: 'MG-002', name: 'Cheese Add-ons', min: 0, max: 3, required: false, items: ['American +$1', 'Cheddar +$1.50', 'Swiss +$1.50', 'Pepper Jack +$2'], linked: 4 },
  ],
  staff: [
    { id: 'S-001', name: 'Maya Chen', email: 'maya@northwind.co', role: 'Admin', loc: 'Flagship — SoHo', status: 'active', clockedIn: true, lastSale: 12 },
    { id: 'S-002', name: 'Diego Ramirez', email: 'diego@northwind.co', role: 'Manager', loc: 'Brooklyn Heights', status: 'active', clockedIn: true, lastSale: 4 },
  ],
  terminals: [
    { id: 'T-1001', location_id: 'L-001', name: 'Front Counter A', loc: 'Flagship — SoHo', device: 'iPad Pro 12.9"', ip: '10.0.4.21', status: 'online', battery: 92, printer: 'EPSON-TM82-A' },
    { id: 'T-1002', location_id: 'L-001', name: 'Front Counter B', loc: 'Flagship — SoHo', device: 'iPad Pro 12.9"', ip: '10.0.4.22', status: 'online', battery: 78, printer: 'EPSON-TM82-A' },
    { id: 'T-1003', location_id: 'L-002', name: 'Counter 1', loc: 'Brooklyn Heights', device: 'Square Register', ip: '10.0.5.10', status: 'online', battery: null, printer: 'STAR-TSP100' },
    { id: 'T-1004', location_id: 'L-004', name: 'SF Station 1', loc: 'SF Ferry Building', device: 'Toast Go 2', ip: '10.1.2.14', status: 'online', battery: 88, printer: 'EPSON-TM82-CHI' },
    { id: 'T-1005', location_id: 'L-005', name: 'Arbaz POS 1', loc: 'Arbaz Outlet', device: 'iPad Mini', ip: '192.168.1.5', status: 'online', battery: 95, printer: 'EPSON-M30' },
  ],
  liveOrders: [
    { id: '#10394', table: 'T-12', items: 4, total: 64.50, channel: 'Dine-in', status: 'preparing', placed: '2m', staff: 'Sara' },
  ],
  hourly: [
    { h: '9a', v: 8 }, { h: '10a', v: 14 }, { h: '11a', v: 22 }, { h: '12p', v: 38 },
  ],
  topProducts: [
    { name: 'Oat Milk Latte', sales: 482, rev: 2772, share: 100 },
    { name: 'Northwind Classic Burger', sales: 314, rev: 4553, share: 65 },
  ],
};
window.DATA = DATA;

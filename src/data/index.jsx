import React from 'react';

// Core domain model: Merchants, Locations, Terminals, etc.
const DATA = {
  merchants: [
    { id: 'M-1', name: 'Northwind Hospitality', email: 'maya@northwind.co', password: 'password123' },
    { id: 'M-2', name: 'Arbaz Tech', email: 'arbaz@tech.co', password: 'password123' },
  ],
  locations: [
    {
      id: 'L-101',
      merchantId: 'M-1',
      name: 'Chelsea HQ',
      code: 'CHL-01',
      city: 'New York',
      status: 'open',
      terminals: 4,
      staff: 12,
      sales: 42190,
      channels: ['Dine-in', 'Takeaway', 'Delivery'],
      type: 'Restaurant',
    },
    {
      id: 'L-102',
      merchantId: 'M-1',
      name: 'West Village',
      code: 'WVL-04',
      city: 'New York',
      status: 'open',
      terminals: 2,
      staff: 8,
      sales: 28400,
      channels: ['Dine-in', 'Takeaway'],
      type: 'Cafe',
    },
    {
      id: 'L-103',
      merchantId: 'M-2',
      name: 'Chicago Downtown',
      code: 'CHI-01',
      city: 'Chicago',
      status: 'open',
      terminals: 6,
      staff: 24,
      sales: 68400,
      channels: ['Dine-in', 'Takeaway', 'Delivery', 'Drive-thru'],
      type: 'Restaurant',
    },
    // Add more if needed
  ],
  terminals: [
    { id: 'T-001', locationId: 'L-101', name: 'Main Bar', device: 'iPad Pro 12.9"', battery: 84, status: 'online', ip: '192.168.1.42', printer: 'Bar Printer 1' },
    { id: 'T-002', locationId: 'L-101', name: 'Dining Room', device: 'iPad Pro 11"', battery: 12, status: 'online', ip: '192.168.1.43', printer: 'Kitchen 1' },
    { id: 'T-003', locationId: 'L-102', name: 'Counter 1', device: 'Elo Pay 15"', battery: null, status: 'online', ip: '10.0.4.12', printer: 'Receipt 1' },
    { id: 'T-004', locationId: 'L-103', name: 'Drive-thru 1', device: 'Tauri Terminal X', battery: null, status: 'online', ip: '172.16.0.4', printer: 'Thermal X' },
  ],
  // ... existing categories and products
  categories: [
    { id: 'C-01', name: 'Mains', icon: 'Flame', color: 'oklch(0.62 0.17 145)', count: 48 },
    { id: 'C-02', name: 'Sides', icon: 'Box', color: 'oklch(0.65 0.14 200)', count: 24 },
    { id: 'C-03', name: 'Drinks', icon: 'Coffee', color: 'oklch(0.70 0.15 70)', count: 18 },
    { id: 'C-04', name: 'Retail', icon: 'Shirt', color: 'oklch(0.55 0.18 290)', count: 156 },
  ],
  products: [
    { id: 'P-1024', name: 'Northwind Classic Burger', price: 14.99, category: 'Mains', status: 'active', stock: 12, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'P-1025', name: 'Smashed Mushroom Burger', price: 16.50, category: 'Mains', status: 'active', stock: 4, image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'P-2031', name: 'Oat Milk Latte', price: 5.50, category: 'Drinks', status: 'active', stock: 999 },
    { id: 'P-3014', name: 'Margherita Pizza', price: 12.00, category: 'Mains', status: 'active', stock: 20 },
    { id: 'P-4001', name: 'Smart POS Hoodie', price: 45.00, category: 'Retail', status: 'active', stock: 84 },
  ]
};

export { DATA };

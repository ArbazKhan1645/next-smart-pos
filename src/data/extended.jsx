import React from 'react';
// Extended data: meal deal groups, product↔group links
export const DEAL_GROUPS = [
  { id: 'DG-001', name: 'Burger Combo', minProducts: 2, maxProducts: 3, dealPrice: 17.99, available: 'All day',
    subProducts: [
      { groupName: 'Main', min: 1, max: 1, options: [
        { id: 'P-1024', name: 'Northwind Classic Burger', upcharge: 0 },
        { id: 'P-1025', name: 'Smashed Mushroom Burger', upcharge: 0 },
        { id: 'P-1026', name: 'Double Stack Cheeseburger', upcharge: 2.50 },
      ]},
      { groupName: 'Side', min: 1, max: 1, options: [
        { id: 'SD-001', name: 'Fries', upcharge: 0 },
        { id: 'SD-002', name: 'Sweet Potato Fries', upcharge: 1.00 },
        { id: 'SD-003', name: 'Side Salad', upcharge: 0 },
      ]},
      { groupName: 'Drink', min: 1, max: 1, options: [
        { id: 'P-5010', name: 'Coke', upcharge: 0 },
        { id: 'P-5011', name: 'Sparkling Water', upcharge: 0.50 },
        { id: 'P-2031', name: 'Oat Milk Latte', upcharge: 2.00 },
      ]},
    ]
  },
  { id: 'DG-002', name: 'Pizza Family Deal', minProducts: 3, maxProducts: 4, dealPrice: 39.99, available: 'After 5p',
    subProducts: [
      { groupName: 'Pizza', min: 1, max: 2, options: [
        { id: 'P-3014', name: 'Margherita Pizza', upcharge: 0 },
        { id: 'P-3015', name: 'Pepperoni Pizza', upcharge: 1.50 },
      ]},
      { groupName: 'Sides', min: 1, max: 1, options: [
        { id: 'SD-001', name: 'Fries', upcharge: 0 },
        { id: 'SD-004', name: 'Garlic Bread', upcharge: 0 },
      ]},
      { groupName: 'Drinks', min: 1, max: 2, options: [
        { id: 'P-5010', name: 'Coke', upcharge: 0 },
        { id: 'P-5011', name: 'Sparkling Water', upcharge: 0 },
      ]},
    ]
  },
  { id: 'DG-003', name: 'Coffee + Pastry', minProducts: 2, maxProducts: 2, dealPrice: 7.99, available: '6a–11a',
    subProducts: [
      { groupName: 'Coffee', min: 1, max: 1, options: [
        { id: 'P-2031', name: 'Oat Milk Latte', upcharge: 0 },
        { id: 'P-2032', name: 'Americano', upcharge: 0 },
        { id: 'P-2033', name: 'Cortado', upcharge: 0 },
      ]},
      { groupName: 'Pastry', min: 1, max: 1, options: [
        { id: 'PS-001', name: 'Almond Croissant', upcharge: 0 },
        { id: 'PS-002', name: 'Pain au Chocolat', upcharge: 0 },
        { id: 'PS-003', name: 'Banana Bread', upcharge: 0.50 },
      ]},
    ]
  },
];

// Special "deal trigger" products — adding these opens the deal builder
export const DEAL_PRODUCTS = [
  { id: 'DEAL-001', name: 'Burger Combo Deal', price: 17.99, dealGroupId: 'DG-001', category: 'Deals', type: 'Restaurant' },
  { id: 'DEAL-002', name: 'Pizza Family Deal', price: 39.99, dealGroupId: 'DG-002', category: 'Deals', type: 'Restaurant' },
  { id: 'DEAL-003', name: 'Coffee + Pastry', price: 7.99, dealGroupId: 'DG-003', category: 'Deals', type: 'Cafe' },
];

// Product → modifier group mappings (many-to-many)
export const PRODUCT_GROUPS = {
  'P-1024': { modGroups: ['MG-001', 'MG-002'], dealGroups: [] },
  'P-1025': { modGroups: ['MG-001', 'MG-002'], dealGroups: [] },
  'P-1026': { modGroups: ['MG-001', 'MG-002'], dealGroups: [] },
  'P-2031': { modGroups: ['MG-003', 'MG-004'], dealGroups: [] },
  'P-2032': { modGroups: ['MG-004'], dealGroups: [] },
  'P-2033': { modGroups: ['MG-003', 'MG-004'], dealGroups: [] },
  'P-3014': { modGroups: ['MG-005'], dealGroups: [] },
  'P-3015': { modGroups: ['MG-005'], dealGroups: [] },
  'P-5010': { modGroups: [], dealGroups: [] },
  'P-5011': { modGroups: [], dealGroups: [] },
  'P-4001': { modGroups: [], dealGroups: [] },
  'P-4002': { modGroups: [], dealGroups: [] },
  'P-4003': { modGroups: [], dealGroups: [] },
  'P-4004': { modGroups: [], dealGroups: [] },
  // Deal products
  'DEAL-001': { modGroups: [], dealGroups: ['DG-001'] },
  'DEAL-002': { modGroups: [], dealGroups: ['DG-002'] },
  'DEAL-003': { modGroups: [], dealGroups: ['DG-003'] },
};

// Modifier group price-mapped items (for cart builder)
export const MOD_GROUP_ITEMS = {
  'MG-001': [
    { id: 'm1', name: 'Rare', price: 0 },
    { id: 'm2', name: 'Medium-rare', price: 0 },
    { id: 'm3', name: 'Medium', price: 0 },
    { id: 'm4', name: 'Medium-well', price: 0 },
    { id: 'm5', name: 'Well done', price: 0 },
  ],
  'MG-002': [
    { id: 'm6', name: 'American', price: 1.00 },
    { id: 'm7', name: 'Cheddar', price: 1.50 },
    { id: 'm8', name: 'Swiss', price: 1.50 },
    { id: 'm9', name: 'Pepper Jack', price: 2.00 },
  ],
  'MG-003': [
    { id: 'm10', name: 'Whole', price: 0 },
    { id: 'm11', name: '2%', price: 0 },
    { id: 'm12', name: 'Oat', price: 0.75 },
    { id: 'm13', name: 'Almond', price: 0.75 },
    { id: 'm14', name: 'Soy', price: 0.75 },
  ],
  'MG-004': [
    { id: 'm15', name: 'Single', price: 0 },
    { id: 'm16', name: 'Double', price: 1.00 },
    { id: 'm17', name: 'Decaf', price: 0 },
    { id: 'm18', name: 'Half-caf', price: 0 },
  ],
  'MG-005': [
    { id: 'm19', name: 'Mushroom', price: 2.00 },
    { id: 'm20', name: 'Olive', price: 1.50 },
    { id: 'm21', name: 'Sausage', price: 3.00 },
    { id: 'm22', name: 'Anchovy', price: 2.00 },
    { id: 'm23', name: 'Basil', price: 1.00 },
  ],
};

// Customers
export const CUSTOMERS = [
  { id: 'C-1001', name: 'Sophia Reyes', email: 'sophia@example.com', phone: '+1 212-555-0142', tier: 'Gold', orders: 47, spend: 1820, points: 1240, lastOrder: '2h' },
  { id: 'C-1002', name: 'Liam O\'Brien', email: 'liam.ob@example.com', phone: '+1 415-555-0188', tier: 'Silver', orders: 22, spend: 740, points: 420, lastOrder: '1d' },
  { id: 'C-1003', name: 'Hana Saito', email: 'hana@example.com', phone: '+1 213-555-0117', tier: 'Platinum', orders: 124, spend: 4920, points: 3400, lastOrder: '12m' },
  { id: 'C-1004', name: 'Marcus Webb', email: 'marcus@example.com', phone: '+1 312-555-0144', tier: 'Bronze', orders: 8, spend: 280, points: 90, lastOrder: '5d' },
  { id: 'C-1005', name: 'Aria Khan', email: 'aria@example.com', phone: '+1 617-555-0161', tier: 'Gold', orders: 38, spend: 1340, points: 880, lastOrder: '3h' },
  { id: 'C-1006', name: 'Jonas Müller', email: 'jonas@example.com', phone: '+1 305-555-0124', tier: 'Silver', orders: 19, spend: 612, points: 320, lastOrder: '6h' },
  { id: 'C-1007', name: 'Zoe Carter', email: 'zoe@example.com', phone: '+1 503-555-0199', tier: 'Bronze', orders: 4, spend: 124, points: 40, lastOrder: '14d' },
  { id: 'C-1008', name: 'Rafael Costa', email: 'rafael@example.com', phone: '+1 786-555-0152', tier: 'Gold', orders: 52, spend: 2110, points: 1480, lastOrder: '1h' },
];

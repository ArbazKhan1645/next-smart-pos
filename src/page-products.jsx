import React from 'react';
// Catalog: Products / Categories / Modifiers
const Products = () => {
  const [tab, setTab] = React.useState('products');
  const [selected, setSelected] = React.useState(new Set());
  const [filter, setFilter] = React.useState('All');
  const [drawer, setDrawer] = React.useState(null);
  const fmtMoney = (n) => '$' + n.toFixed(2);

  const cats = ['All', ...Array.from(new Set(DATA.products.map(p => p.category)))];
  const filtered = filter === 'All' ? DATA.products : DATA.products.filter(p => p.category === filter);

  const toggleSel = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const allSel = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Catalog</h1>
          <p className="page-sub">Manage products, categories, modifiers and meal deals across {DATA.merchant.locations} locations.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn"><I.Upload size={12}/> Import</button>
          <button className="btn"><I.Download size={12}/> Export</button>
          <button className="btn btn-primary" onClick={() => setDrawer({ type: 'product', mode: 'new' })}>
            <I.Plus size={12}/> New product
          </button>
        </div>
      </div>

      <div className="page-tabs">
        {[
          { id: 'products', label: 'Products', count: 248 },
          { id: 'categories', label: 'Categories', count: 14 },
          { id: 'modifiers', label: 'Modifier Groups', count: 18 },
          { id: 'deals', label: 'Meal Deals', count: 8 },
          { id: 'taxes', label: 'Tax Classes', count: 6 },
        ].map(t => (
          <div key={t.id} className={'page-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label} <span className="count">{t.count}</span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search size={12}/>
          <input placeholder="Search by name, SKU, barcode…"/>
          <span className="kbd">/</span>
        </div>
        <button className="btn btn-sm"><I.Filter size={11}/> Status</button>
        <select className="btn btn-sm" style={{ paddingRight: 22, appearance: 'none' }}
          value={filter} onChange={e => setFilter(e.target.value)}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn btn-sm">Channel: All</button>
        <button className="btn btn-sm">Location: All</button>
        <div style={{ flex: 1 }}/>
        {selected.size > 0 && (
          <>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.size} selected</span>
            <button className="btn btn-sm">Bulk edit</button>
            <button className="btn btn-sm btn-danger"><I.Trash size={11}/> Archive</button>
          </>
        )}
        <button className="btn btn-sm btn-icon"><I.Layout size={12}/></button>
      </div>

      {tab === 'products' && (
        <div style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th className="checkbox-col"><Cbx checked={allSel} onClick={() => {
                  setSelected(allSel ? new Set() : new Set(filtered.map(p => p.id)));
                }}/></th>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Channels</th>
                <th>Mods</th>
                <th className="num">Cost</th>
                <th className="num">Price</th>
                <th className="num">Margin</th>
                <th className="num">Stock</th>
                <th>Status</th>
                <th className="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const margin = ((p.price - p.cost) / p.price * 100).toFixed(0);
                return (
                  <tr key={p.id} className={selected.has(p.id) ? 'selected' : ''}>
                    <td><Cbx checked={selected.has(p.id)} onClick={() => toggleSel(p.id)}/></td>
                    <td>
                      <div className="table-cell-product">
                        <div className="table-thumb">
                          {p.type === 'Restaurant' ? <I.Flame size={13}/> :
                           p.type === 'Cafe' ? <I.Coffee size={13}/> :
                           <I.Shirt size={13}/>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{p.sku}</td>
                    <td>{p.category}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {p.channels.slice(0, 2).map(c => <span key={c} className="chip" style={{ fontSize: 10, padding: '1px 5px' }}>{c}</span>)}
                        {p.channels.length > 2 && <span className="chip" style={{ fontSize: 10, padding: '1px 5px' }}>+{p.channels.length - 2}</span>}
                      </div>
                    </td>
                    <td className="num" style={{ color: p.modifiers ? 'var(--ink)' : 'var(--muted-2)' }}>{p.modifiers || '—'}</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>{fmtMoney(p.cost)}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{fmtMoney(p.price)}</td>
                    <td className="num" style={{ color: margin > 60 ? 'var(--accent)' : 'var(--ink-2)' }}>{margin}%</td>
                    <td className="num" style={{ color: p.status === 'oos' ? 'var(--danger)' : p.status === 'low' ? 'oklch(0.55 0.14 70)' : 'var(--ink)' }}>
                      {p.stock === 999 ? '∞' : p.stock}
                    </td>
                    <td>
                      {p.status === 'active' && <span className="chip chip-accent"><span className="dot"/>Active</span>}
                      {p.status === 'low' && <span className="chip chip-warn"><span className="dot"/>Low stock</span>}
                      {p.status === 'oos' && <span className="chip chip-danger"><span className="dot"/>Out</span>}
                    </td>
                    <td className="actions-col">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDrawer({ type: 'product', item: p })}>
                        <I.More size={12}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'categories' && <CategoriesView/>}
      {tab === 'modifiers' && <ModifiersView/>}
      {tab === 'deals' && <DealsView/>}
      {tab === 'taxes' && <TaxesView/>}

      {drawer && <ProductDrawer item={drawer.item} mode={drawer.mode} onClose={() => setDrawer(null)}/>}
    </div>
  );
};

const CategoriesView = () => {
  const cats = [
    { name: 'Burgers', count: 18, color: 'oklch(0.65 0.17 25)', priority: 1, schedule: 'All day', channels: 4, parent: null },
    { name: 'Pizza', count: 12, color: 'oklch(0.70 0.15 70)', priority: 2, schedule: 'All day', channels: 3, parent: null },
    { name: 'Coffee', count: 24, color: 'oklch(0.55 0.10 50)', priority: 3, schedule: '6a–6p', channels: 3, parent: null },
    { name: '— Espresso', count: 8, color: 'oklch(0.55 0.10 50)', priority: 1, schedule: '6a–6p', channels: 3, parent: 'Coffee' },
    { name: '— Filter', count: 6, color: 'oklch(0.55 0.10 50)', priority: 2, schedule: '6a–2p', channels: 2, parent: 'Coffee' },
    { name: 'Beverages', count: 32, color: 'oklch(0.65 0.14 200)', priority: 4, schedule: 'All day', channels: 5, parent: null },
    { name: 'Apparel', count: 48, color: 'oklch(0.45 0.05 280)', priority: 5, schedule: 'All day', channels: 2, parent: null },
    { name: 'Accessories', count: 22, color: 'oklch(0.60 0.12 290)', priority: 6, schedule: 'All day', channels: 2, parent: null },
  ];
  return (
    <div style={{ padding: 16, overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 24 }}></th>
            <th>Category</th>
            <th className="num">Priority</th>
            <th className="num">Products</th>
            <th>Schedule</th>
            <th className="num">Channels</th>
            <th>Parent</th>
            <th className="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--muted-2)' }}><I.Drag size={12}/></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, background: c.color, borderRadius: 3 }}/>
                  <span style={{ fontWeight: c.parent ? 400 : 500, color: c.parent ? 'var(--muted)' : 'var(--ink)' }}>{c.name}</span>
                </div>
              </td>
              <td className="num">{c.priority}</td>
              <td className="num">{c.count}</td>
              <td><span className="chip">{c.schedule}</span></td>
              <td className="num">{c.channels}</td>
              <td style={{ color: 'var(--muted)' }}>{c.parent || '—'}</td>
              <td className="actions-col"><button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ModifiersView = () => (
  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
    {DATA.modifierGroups.map(g => (
      <div key={g.id} className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{g.name}</div>
            <div className="card-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{g.id}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {g.required && <span className="chip chip-info">Required</span>}
            <span className="chip">min {g.min} · max {g.max}</span>
          </div>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {g.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
              <I.Drag size={12} style={{ color: 'var(--muted-2)' }}/>
              <span style={{ flex: 1, fontSize: 12 }}>{it}</span>
              <button className="btn btn-ghost btn-icon btn-sm"><I.More size={11}/></button>
            </div>
          ))}
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 4, justifyContent: 'flex-start' }}>
            <I.Plus size={11}/> Add modifier
          </button>
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }}>
          <I.Box size={11}/> Linked to {g.linked} products
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm">Edit</button>
        </div>
      </div>
    ))}
  </div>
);

const DealsView = () => (
  <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
    <div style={{ fontSize: 13, marginBottom: 4 }}>8 active meal deals</div>
    <div style={{ fontSize: 11 }}>Deal builder UI here · Burger + Fries + Drink combos, 2-for-1 offers, time-restricted bundles</div>
  </div>
);
const TaxesView = () => (
  <div style={{ padding: 16 }}>
    <table className="table">
      <thead><tr><th>Tax class</th><th>Rate</th><th>Type</th><th>Region</th><th className="num">Linked</th></tr></thead>
      <tbody>
        {[
          ['Standard NY', '8.875%', 'Inclusive', 'New York, NY', 142],
          ['Standard MA', '6.25%', 'Exclusive', 'Boston, MA', 38],
          ['Standard IL', '10.25%', 'Exclusive', 'Chicago, IL', 56],
          ['Beverage Tax', '1.00%', 'Exclusive', 'Cook County, IL', 24],
          ['Standard CA', '9.50%', 'Exclusive', 'Los Angeles, CA', 48],
          ['Zero', '0%', '—', 'All', 12],
        ].map((r, i) => (
          <tr key={i}>
            <td style={{ fontWeight: 500 }}>{r[0]}</td>
            <td style={{ fontFamily: 'var(--font-mono)' }}>{r[1]}</td>
            <td>{r[2]}</td>
            <td style={{ color: 'var(--muted)' }}>{r[3]}</td>
            <td className="num">{r[4]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProductDrawer = ({ item, mode, onClose }) => {
  const p = item || { name: '', sku: '', price: 0, cost: 0, category: 'Burgers', channels: [], modifiers: 0, stock: 0 };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 540,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.id || 'New product'}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{mode === 'new' ? 'Create new product' : p.name}</div>
          </div>
          <button className="btn btn-sm">Save draft</button>
          <button className="btn btn-sm btn-primary">Publish</button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><I.X size={14}/></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Product name"><input className="input" defaultValue={p.name} placeholder="e.g. Northwind Classic Burger"/></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="SKU"><input className="input" defaultValue={p.sku} style={{ fontFamily: 'var(--font-mono)' }}/></Field>
            <Field label="Barcode"><input className="input" placeholder="—" style={{ fontFamily: 'var(--font-mono)' }}/></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Cost"><input className="input" defaultValue={p.cost}/></Field>
            <Field label="Selling price"><input className="input" defaultValue={p.price}/></Field>
            <Field label="Tax class"><select className="input"><option>Standard NY</option></select></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={3} placeholder="Short product description used on QR menus and receipts."/></Field>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Channels</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Dine-in','Takeaway','Delivery','QR Order','Drive-thru','Online'].map(c => (
                <span key={c} className={'chip' + (p.channels && p.channels.includes(c) ? ' chip-accent' : '')}>{c}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Modifier groups</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {DATA.modifierGroups.slice(0, 3).map(g => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4 }}>
                  <Cbx checked={true}/>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>{g.name}</span>
                  <span className="chip" style={{ fontSize: 10 }}>min {g.min}/max {g.max}</span>
                </label>
              ))}
              <button className="btn btn-sm btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <I.Plus size={11}/> Attach modifier group
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Printer routing</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="chip chip-info"><I.Printer size={10}/> Kitchen — Hot Line</span>
              <span className="chip"><I.Plus size={10}/> Add</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .input {
          width: 100%; padding: 6px 8px; font-size: 12px; font-family: inherit;
          border: 1px solid var(--border); border-radius: 4px; background: var(--surface);
          color: var(--ink); outline: none;
        }
        .input:focus { border-color: var(--ink); }
      `}</style>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{label}</span>
    {children}
  </label>
);


export { Products, Field };

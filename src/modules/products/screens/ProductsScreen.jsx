import React from 'react';
import { PRODUCTS, CATEGORIES, MODIFIER_GROUPS, SALE_CHANNELS } from '../../../data/index.jsx';

const fmtMoney = (n) => (n == null ? '—' : '$' + Number(n).toFixed(2));

const categoryByUuid = (uuid) => CATEGORIES.find(c => c.uuid === uuid);
const saleChannelById = (id) => SALE_CHANNELS.find(c => c.id === id);

const ProductsScreen = () => {
  const { I, Cbx } = window;
  const [tab, setTab] = React.useState('products');
  const [selected, setSelected] = React.useState(new Set());
  const [filterCat, setFilterCat] = React.useState('All');
  const [drawer, setDrawer] = React.useState(null);

  const catNames = ['All', ...Array.from(new Set(
    PRODUCTS.map(p => categoryByUuid(p.category_uuid)?.name).filter(Boolean)
  ))];

  const filtered = filterCat === 'All'
    ? PRODUCTS
    : PRODUCTS.filter(p => categoryByUuid(p.category_uuid)?.name === filterCat);

  const toggleSel = (uuid) => {
    const s = new Set(selected);
    s.has(uuid) ? s.delete(uuid) : s.add(uuid);
    setSelected(s);
  };
  const allSel = filtered.length > 0 && filtered.every(p => selected.has(p.uuid));

  const grossMargin = (p) => {
    if (!p.selling_price) return '—';
    if (!p.buying_price) return '100';
    return ((p.selling_price - p.buying_price) / p.selling_price * 100).toFixed(0);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Catalog</h1>
          <p className="page-sub">Manage products, categories, modifiers and meal deals.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn"><I.Upload size={12}/> Import</button>
          <button className="btn"><I.Download size={12}/> Export</button>
          <button className="btn btn-primary" onClick={() => setDrawer({ mode: 'new' })}>
            <I.Plus size={12}/> New product
          </button>
        </div>
      </div>

      <div className="page-tabs">
        {[
          { id: 'products',   label: 'Products',        count: PRODUCTS.length },
          { id: 'categories', label: 'Categories',       count: CATEGORIES.length },
          { id: 'modifiers',  label: 'Modifier Groups',  count: MODIFIER_GROUPS.length },
          { id: 'deals',      label: 'Meal Deals',       count: 8 },
          { id: 'taxes',      label: 'Tax Classes',      count: 6 },
        ].map(t => (
          <div key={t.id} className={'page-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label} <span className="count">{t.count}</span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search size={12}/>
          <input placeholder="Search by name, PLU, barcode…"/>
          <span className="kbd">/</span>
        </div>
        <button className="btn btn-sm"><I.Filter size={11}/> Status</button>
        <select className="btn btn-sm" style={{ paddingRight: 22, appearance: 'none' }}
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          {catNames.map(c => <option key={c}>{c}</option>)}
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
                <th className="checkbox-col"><Cbx checked={allSel} onClick={() =>
                  setSelected(allSel ? new Set() : new Set(filtered.map(p => p.uuid)))
                }/></th>
                <th>Product</th>
                <th>PLU / Barcode</th>
                <th>Category</th>
                <th>Channels</th>
                <th className="num">Cost</th>
                <th className="num">Price</th>
                <th className="num">Margin</th>
                <th>Status</th>
                <th className="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const cat = categoryByUuid(p.category_uuid);
                const margin = grossMargin(p);
                const channels = (p.sale_channels || []).map(sc => saleChannelById(sc.id)?.name).filter(Boolean);
                return (
                  <tr key={p.uuid} className={selected.has(p.uuid) ? 'selected' : ''}>
                    <td><Cbx checked={selected.has(p.uuid)} onClick={() => toggleSel(p.uuid)}/></td>
                    <td>
                      <div className="table-cell-product">
                        <div className="table-thumb" style={{ background: cat?.background_color || 'var(--surface-2)' }}>
                          <I.Box size={13}/>
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.uuid}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                      {p.plu_code || p.barcode || '—'}
                    </td>
                    <td>
                      {cat ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.background_color || 'var(--muted-2)', flexShrink: 0 }}/>
                          {cat.name}
                        </div>
                      ) : <span style={{ color: 'var(--muted-2)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {channels.slice(0, 2).map(c => <span key={c} className="chip" style={{ fontSize: 10, padding: '1px 5px' }}>{c}</span>)}
                        {channels.length > 2 && <span className="chip" style={{ fontSize: 10, padding: '1px 5px' }}>+{channels.length - 2}</span>}
                      </div>
                    </td>
                    <td className="num" style={{ color: 'var(--muted)' }}>{fmtMoney(p.buying_price)}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{fmtMoney(p.selling_price)}</td>
                    <td className="num" style={{ color: margin > 60 ? 'var(--accent)' : 'var(--ink-2)' }}>{margin}%</td>
                    <td>
                      {p.is_active
                        ? <span className="chip chip-accent"><span className="dot"/>Active</span>
                        : <span className="chip chip-danger"><span className="dot"/>Inactive</span>}
                      {p.featured && <span className="chip chip-info" style={{ marginLeft: 4 }}>Featured</span>}
                    </td>
                    <td className="actions-col">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDrawer({ item: p })}>
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
  const { I } = window;
  return (
    <div style={{ padding: 16, overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 24 }}></th>
            <th>Category</th>
            <th className="num">Sort</th>
            <th>Description</th>
            <th className="num">Printers</th>
            <th>Parent</th>
            <th>Display</th>
            <th className="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(c => {
            const parent = c.parent_uuid ? CATEGORIES.find(x => x.uuid === c.parent_uuid) : null;
            return (
              <tr key={c.uuid}>
                <td style={{ color: 'var(--muted-2)' }}><I.Drag size={12}/></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, background: c.background_color || 'var(--muted-2)', borderRadius: 3 }}/>
                    <span style={{ fontWeight: parent ? 400 : 500, color: parent ? 'var(--muted)' : 'var(--ink)' }}>
                      {parent ? '— ' : ''}{c.name}
                    </span>
                  </div>
                </td>
                <td className="num">{c.index ?? '—'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 11 }}>{c.description || '—'}</td>
                <td className="num">{(c.printers || []).length}</td>
                <td style={{ color: 'var(--muted)' }}>{parent?.name || '—'}</td>
                <td>
                  {c.show_on_display
                    ? <span className="chip chip-accent">Visible</span>
                    : <span className="chip">Hidden</span>}
                </td>
                <td className="actions-col"><button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ModifiersView = () => {
  const { I } = window;
  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
      {MODIFIER_GROUPS.map(g => (
        <div key={g.uuid} className="card">
          <div className="card-head">
            <div>
              <div className="card-title">{g.name}</div>
              <div className="card-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{g.uuid}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {g.minimum > 0 && <span className="chip chip-info">Required</span>}
              <span className="chip">min {g.minimum} · max {g.maximum}</span>
            </div>
          </div>
          <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <span>Location: {g.location_id ?? '—'}</span>
            {g.background_color && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: g.background_color }}/> Color
            </span>}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }}>
            <I.Box size={11}/>
            <span>min {g.minimum} required · max {g.maximum} allowed</span>
            <div style={{ flex: 1 }}/>
            <button className="btn btn-sm">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
};

const DealsView = () => (
  <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
    <div style={{ fontSize: 13, marginBottom: 4 }}>Meal Deal Groups</div>
    <div style={{ fontSize: 11 }}>meal_deal_group_table · meal_deal_junction_table — builder UI coming next.</div>
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
  const { I, Cbx } = window;
  const p = item || {};
  const cat = categoryByUuid(p.category_uuid);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 540,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.uuid || 'new'}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{mode === 'new' ? 'Create new product' : p.name}</div>
          </div>
          <button className="btn btn-sm">Save draft</button>
          <button className="btn btn-sm btn-primary">Publish</button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><I.X size={14}/></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Product name">
            <input className="input" defaultValue={p.name} placeholder="e.g. Northwind Classic Burger"/>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="PLU Code">
              <input className="input" defaultValue={p.plu_code} style={{ fontFamily: 'var(--font-mono)' }}/>
            </Field>
            <Field label="Barcode">
              <input className="input" defaultValue={p.barcode} style={{ fontFamily: 'var(--font-mono)' }}/>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Buying price"><input className="input" defaultValue={p.buying_price}/></Field>
            <Field label="Selling price"><input className="input" defaultValue={p.selling_price}/></Field>
            <Field label="Tax class"><select className="input"><option>Standard NY</option></select></Field>
          </div>
          <Field label="Category">
            <select className="input" defaultValue={p.category_uuid || ''}>
              <option value="">— None —</option>
              {CATEGORIES.filter(c => !c.parent_uuid).map(c => (
                <option key={c.uuid} value={c.uuid}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className="input" rows={3} defaultValue={p.description} placeholder="Short product description."/>
          </Field>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Sale Channels</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SALE_CHANNELS.map(sc => {
                const active = (p.sale_channels || []).some(s => s.id === sc.id);
                return <span key={sc.uuid} className={'chip' + (active ? ' chip-accent' : '')}>{sc.name}</span>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Flags</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                ['is_active', 'Active', p.is_active],
                ['featured', 'Featured', p.featured],
                ['show_on_display', 'Show on display', p.show_on_display],
                ['open_price', 'Open price', p.open_price],
                ['weight', 'Sold by weight', p.weight],
                ['custom_product', 'Custom product', p.custom_product],
              ].map(([key, label, val]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <Cbx checked={!!val}/>
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Modifier groups</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {MODIFIER_GROUPS.slice(0, 3).map(g => (
                <label key={g.uuid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4 }}>
                  <Cbx checked={false}/>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>{g.name}</span>
                  <span className="chip" style={{ fontSize: 10 }}>min {g.minimum}/max {g.maximum}</span>
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
        .input { width:100%; padding:6px 8px; font-size:12px; font-family:inherit;
          border:1px solid var(--border); border-radius:4px; background:var(--surface);
          color:var(--ink); outline:none; box-sizing:border-box; }
        .input:focus { border-color:var(--ink); }
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

export default ProductsScreen;
export { Field };

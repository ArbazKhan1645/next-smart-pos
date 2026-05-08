import React from 'react';
// POS Register — primary screen with smart cart logic
const POSRegister = ({ ctx, onExit }) => {
  const [cart, setCart] = React.useState([]);
  const [activeCat, setActiveCat] = React.useState('Burgers');
  const [search, setSearch] = React.useState('');
  const [modal, setModal] = React.useState(null); // { type: 'modifier'|'deal', product, ...}
  const isRetail = ctx?.posType?.id === 'retail';

  // All products (regular + deal triggers)
  const allProducts = [...DATA.products, ...window.DEAL_PRODUCTS];
  const cats = Array.from(new Set(allProducts.map(p => p.category)));
  const filtered = allProducts.filter(p => {
    if (search) return (p.name + ' ' + (p.sku || '') + ' ' + p.id).toLowerCase().includes(search.toLowerCase());
    return p.category === activeCat;
  });

  const handleAddProduct = (p) => {
    const links = window.PRODUCT_GROUPS[p.id] || { modGroups: [], dealGroups: [] };
    // 1. Check if it's a deal product
    if (links.dealGroups && links.dealGroups.length > 0) {
      const group = window.DEAL_GROUPS.find(g => g.id === links.dealGroups[0]);
      setModal({ type: 'deal', product: p, group });
      return;
    }
    // 2. Check if it has modifier groups
    if (links.modGroups && links.modGroups.length > 0) {
      setModal({ type: 'modifier', product: p, groupIds: links.modGroups });
      return;
    }
    // 3. Plain product — straight to cart
    addToCart({ ...p, qty: 1, mods: [], subItems: [], lineId: Date.now() + Math.random() });
  };

  const addToCart = (line) => setCart(c => [...c, line]);
  const updateQty = (lineId, delta) => setCart(c => c.map(l => l.lineId === lineId ? { ...l, qty: Math.max(0, l.qty + delta) } : l).filter(l => l.qty > 0));
  const removeLine = (lineId) => setCart(c => c.filter(l => l.lineId !== lineId));

  const lineTotal = (l) => {
    const modSum = (l.mods || []).reduce((a, m) => a + m.price, 0);
    const subSum = (l.subItems || []).reduce((a, s) => a + s.upcharge, 0);
    return (l.price + modSum + subSum) * l.qty;
  };
  const sub = cart.reduce((s, l) => s + lineTotal(l), 0);
  const tax = sub * 0.08875;
  const tip = ctx?.channel?.id === 'dine-in' ? sub * 0.18 : 0;
  const total = sub + tax + tip;
  const fmt = (n) => '$' + n.toFixed(2);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 400px', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Left rail */}
      <div style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
        <div className="sb-logo" style={{ width: 32, height: 32, fontSize: 14 }}>S</div>
        <div style={{ width: 32, height: 1, background: 'var(--border)', margin: '12px 0' }}/>
        {[
          { i: 'Cart', t: 'Register', active: true },
          { i: 'Receipt', t: 'Orders' },
          { i: 'Users', t: 'Customers' },
          { i: 'Box', t: 'Catalog' },
          { i: 'Chart', t: 'Reports' },
        ].map((it, idx) => {
          const Ico = I[it.i];
          return (
            <button key={idx} title={it.t} className="rail-btn" style={{ background: it.active ? 'var(--ink)' : 'transparent', color: it.active ? '#fff' : 'var(--ink-2)' }}>
              <Ico size={18}/>
            </button>
          );
        })}
        <div style={{ flex: 1 }}/>
        <button className="rail-btn" onClick={onExit} title="Back to admin"><I.Settings size={18}/></button>
        <div className="sb-avatar" style={{ width: 32, height: 32, marginTop: 8 }}>{ctx?.staff?.initials || 'MC'}</div>
      </div>

      {/* Center: catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 48, padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="chip chip-accent"><span className="dot"/>{ctx?.location?.code || 'NYC-01'}</span>
          <span className="chip">{ctx?.terminal?.id || 'T-1001'}</span>
          <span className="chip chip-info">{ctx?.channel?.name || 'Dine-in'}</span>
          <span className="chip">{ctx?.posType?.name || 'Restaurant POS'}</span>
          <div style={{ flex: 1 }}/>
          <div className="toolbar-search" style={{ width: 280 }}>
            <I.Search size={12}/>
            <input placeholder={isRetail ? 'Scan or search SKU…' : 'Search menu…'} value={search} onChange={e => setSearch(e.target.value)}/>
            <span className="kbd">/</span>
          </div>
          <button className="btn btn-sm"><I.Refresh size={11}/></button>
        </div>

        {/* Category bar */}
        {!search && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {cats.map(c => (
              <button key={c} className="btn btn-sm"
                style={activeCat === c ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}}
                onClick={() => setActiveCat(c)}>
                {c === 'Deals' && <I.Sparkles size={11}/>} {c}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {filtered.map(p => {
              const links = window.PRODUCT_GROUPS[p.id] || {};
              const isDeal = links.dealGroups && links.dealGroups.length > 0;
              const hasMods = links.modGroups && links.modGroups.length > 0;
              return (
                <button key={p.id} onClick={() => handleAddProduct(p)} className="prod-card-pos">
                  {isDeal && <span className="prod-badge" style={{ background: 'var(--accent)', color: '#fff' }}><I.Sparkles size={9}/> Deal</span>}
                  {hasMods && !isDeal && <span className="prod-badge" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>{links.modGroups.length} mods</span>}
                  <div style={{ height: 78, background: 'var(--surface-2)', borderRadius: 5, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                    {isDeal ? <I.Sparkles size={26}/> :
                     p.type === 'Restaurant' ? <I.Flame size={24}/> :
                     p.type === 'Cafe' ? <I.Coffee size={24}/> :
                     <I.Shirt size={24}/>}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500, lineHeight: 1.25, textAlign: 'left', minHeight: 32 }}>{p.name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(p.price)}</span>
                    {p.sku && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{p.sku.slice(0, 7)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: cart */}
      <div style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.Cart size={15}/>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Order #10402</span>
          <span className="chip" style={{ fontSize: 10 }}>
            {ctx?.channel?.id === 'dine-in' ? 'Table 12' : ctx?.channel?.name || 'Walk-in'}
          </span>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost btn-icon btn-sm" title="Park"><I.Clock size={12}/></button>
          <button className="btn btn-ghost btn-icon btn-sm" title="Clear" onClick={() => setCart([])}><I.Trash size={12}/></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-2)', fontSize: 12 }}>
              <I.Cart size={32} style={{ opacity: 0.3, marginBottom: 8 }}/>
              <div>Cart is empty</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Tap any item to add</div>
            </div>
          )}
          {cart.map(l => (
            <div key={l.lineId} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l.dealGroupId && <I.Sparkles size={11} style={{ color: 'var(--accent)' }}/>}
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{l.name}</span>
                  </div>
                  {(l.subItems || []).map((s, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 12, marginTop: 2 }}>
                      <span style={{ color: 'var(--muted-2)' }}>{s.groupName}:</span> {s.name}
                      {s.upcharge > 0 && <span style={{ fontFamily: 'var(--font-mono)' }}> +{fmt(s.upcharge)}</span>}
                    </div>
                  ))}
                  {(l.mods || []).map((m, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 12, marginTop: 2 }}>
                      · {m.name}{m.price > 0 && <span style={{ fontFamily: 'var(--font-mono)' }}> +{fmt(m.price)}</span>}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className="btn btn-icon btn-sm" onClick={() => updateQty(l.lineId, -1)}>−</button>
                  <span className="num" style={{ width: 18, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{l.qty}</span>
                  <button className="btn btn-icon btn-sm" onClick={() => updateQty(l.lineId, 1)}>+</button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <span className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 12 }}>{fmt(lineTotal(l))}</span>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && <>
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
            <Row k="Subtotal" v={fmt(sub)}/>
            <Row k="Tax (8.875%)" v={fmt(tax)} muted/>
            {tip > 0 && <Row k="Tip (18%)" v={fmt(tip)} muted/>}
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }}/>
            <Row k="Total" v={fmt(total)} strong/>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button className="btn">Discount</button>
            <button className="btn">Customer</button>
            <button className="btn">Split</button>
            <button className="btn">Hold</button>
            <button className="btn btn-primary" style={{ gridColumn: 'span 2', height: 38, fontSize: 13 }}>
              Charge {fmt(total)}
            </button>
          </div>
        </>}
      </div>

      {modal && modal.type === 'modifier' && <ModifierModal product={modal.product} groupIds={modal.groupIds}
        onCancel={() => setModal(null)}
        onConfirm={(mods) => { addToCart({ ...modal.product, qty: 1, mods, subItems: [], lineId: Date.now() + Math.random() }); setModal(null); }}/>}
      {modal && modal.type === 'deal' && <DealModal product={modal.product} group={modal.group}
        onCancel={() => setModal(null)}
        onConfirm={(subItems) => { addToCart({ ...modal.product, qty: 1, mods: [], subItems, dealGroupId: modal.group.id, lineId: Date.now() + Math.random() }); setModal(null); }}/>}

      <style>{`
        .rail-btn {
          width: 40px; height: 40px; margin: 4px 0; border-radius: 8px;
          border: none; background: transparent; cursor: pointer; color: var(--ink-2);
          display: grid; place-items: center;
        }
        .rail-btn:hover { background: var(--surface-2); }
        .prod-card-pos {
          position: relative;
          background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
          padding: 8px; cursor: pointer; font-family: inherit; text-align: left;
          transition: border-color 100ms;
        }
        .prod-card-pos:hover { border-color: var(--ink); }
        .prod-card-pos:active { transform: scale(0.98); }
        .prod-badge {
          position: absolute; top: 6px; right: 6px; z-index: 1;
          font-size: 9px; font-weight: 600; padding: 2px 5px; border-radius: 3px;
          display: inline-flex; align-items: center; gap: 3px; letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );
};

// Modifier picker modal — handles min/max across multiple groups
const ModifierModal = ({ product, groupIds, onCancel, onConfirm }) => {
  const groups = groupIds.map(id => DATA.modifierGroups.find(g => g.id === id)).filter(Boolean);
  const [selected, setSelected] = React.useState(() => {
    const init = {};
    groups.forEach(g => { init[g.id] = []; });
    return init;
  });
  const toggle = (groupId, item, max) => {
    setSelected(s => {
      const cur = s[groupId] || [];
      const has = cur.find(c => c.id === item.id);
      if (has) return { ...s, [groupId]: cur.filter(c => c.id !== item.id) };
      if (max === 1) return { ...s, [groupId]: [item] };
      if (cur.length >= max) return s;
      return { ...s, [groupId]: [...cur, item] };
    });
  };
  const allValid = groups.every(g => {
    const c = (selected[g.id] || []).length;
    return c >= g.min && c <= g.max;
  });
  const allMods = Object.values(selected).flat();
  const upcharge = allMods.reduce((a, m) => a + m.price, 0);

  return (
    <Modal title={`Customize · ${product.name}`} onClose={onCancel}
      footer={<>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {upcharge > 0 ? `+$${upcharge.toFixed(2)} upcharge` : 'No upcharge'}
        </span>
        <div style={{ flex: 1 }}/>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!allValid} style={{ opacity: allValid ? 1 : 0.4 }} onClick={() => onConfirm(allMods)}>
          Add to cart · ${(product.price + upcharge).toFixed(2)}
        </button>
      </>}>
      {groups.map(g => {
        const items = window.MOD_GROUP_ITEMS[g.id] || [];
        const cur = selected[g.id] || [];
        const valid = cur.length >= g.min && cur.length <= g.max;
        return (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
              {g.required && <span className="chip chip-info" style={{ fontSize: 10 }}>Required</span>}
              <span className="chip" style={{ fontSize: 10 }}>min {g.min} · max {g.max}</span>
              <div style={{ flex: 1 }}/>
              <span style={{ fontSize: 11, color: valid ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {cur.length}/{g.max}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {items.map(it => {
                const sel = cur.find(c => c.id === it.id);
                return (
                  <button key={it.id} onClick={() => toggle(g.id, it, g.max)}
                    style={{
                      padding: '8px 10px', textAlign: 'left',
                      border: '1px solid ' + (sel ? 'var(--ink)' : 'var(--border)'),
                      background: sel ? 'var(--surface-2)' : 'var(--surface)',
                      borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: g.max === 1 ? '50%' : 3,
                      border: '1.5px solid ' + (sel ? 'var(--ink)' : 'var(--border-strong)'),
                      background: sel ? 'var(--ink)' : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0
                    }}>
                      {sel && <I.Check size={9} style={{ color: '#fff' }}/>}
                    </div>
                    <div style={{ flex: 1, fontSize: 12 }}>{it.name}</div>
                    {it.price > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>+${it.price.toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Modal>
  );
};

const DealModal = ({ product, group, onCancel, onConfirm }) => {
  const [picks, setPicks] = React.useState(() => group.subProducts.map(() => []));
  const togglePick = (gIdx, opt, max) => {
    setPicks(p => {
      const next = [...p];
      const cur = next[gIdx];
      const has = cur.find(c => c.id === opt.id);
      if (has) next[gIdx] = cur.filter(c => c.id !== opt.id);
      else if (max === 1) next[gIdx] = [{ ...opt, groupName: group.subProducts[gIdx].groupName }];
      else if (cur.length < max) next[gIdx] = [...cur, { ...opt, groupName: group.subProducts[gIdx].groupName }];
      return next;
    });
  };
  const allValid = group.subProducts.every((g, i) => picks[i].length >= g.min && picks[i].length <= g.max);
  const flat = picks.flat();
  const upcharge = flat.reduce((a, p) => a + p.upcharge, 0);
  return (
    <Modal title={`Build your ${product.name}`} subtitle={`${group.dealPrice ? '$' + group.dealPrice.toFixed(2) + ' base · ' : ''}${group.available}`} onClose={onCancel}
      footer={<>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {upcharge > 0 ? `+$${upcharge.toFixed(2)} upcharge · ` : ''}
          Total ${(product.price + upcharge).toFixed(2)}
        </span>
        <div style={{ flex: 1 }}/>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!allValid} style={{ opacity: allValid ? 1 : 0.4 }} onClick={() => onConfirm(flat)}>
          Add deal to cart →
        </button>
      </>}>
      {group.subProducts.map((sub, gIdx) => {
        const cur = picks[gIdx];
        const valid = cur.length >= sub.min && cur.length <= sub.max;
        return (
          <div key={gIdx} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)' }}>{gIdx + 1}</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Choose {sub.groupName}</div>
              <span className="chip" style={{ fontSize: 10 }}>{sub.min === sub.max ? `Pick ${sub.min}` : `Pick ${sub.min}–${sub.max}`}</span>
              <div style={{ flex: 1 }}/>
              <span style={{ fontSize: 11, color: valid ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {cur.length}/{sub.max}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
              {sub.options.map(opt => {
                const sel = cur.find(c => c.id === opt.id);
                return (
                  <button key={opt.id} onClick={() => togglePick(gIdx, opt, sub.max)}
                    style={{
                      padding: 10, textAlign: 'left',
                      border: '1px solid ' + (sel ? 'var(--ink)' : 'var(--border)'),
                      background: sel ? 'var(--surface-2)' : 'var(--surface)',
                      borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: sub.max === 1 ? '50%' : 3,
                      border: '1.5px solid ' + (sel ? 'var(--ink)' : 'var(--border-strong)'),
                      background: sel ? 'var(--ink)' : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0
                    }}>{sel && <I.Check size={9} style={{ color: '#fff' }}/>}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{opt.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{opt.id}</div>
                    </div>
                    {opt.upcharge > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>+${opt.upcharge.toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Modal>
  );
};

const Modal = ({ title, subtitle, onClose, footer, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.4)', zIndex: 100, display: 'grid', placeItems: 'center' }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      width: 'min(720px, 92vw)', maxHeight: '85vh', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{subtitle}</div>}
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><I.X size={13}/></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{children}</div>
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>{footer}</div>
    </div>
  </div>
);


export { POSRegister };

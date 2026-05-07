// Live Orders / KDS / Cart / POS Register
const Orders = () => {
  const [tab, setTab] = React.useState('kds');
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Operations · Live</h1>
          <p className="page-sub">Real-time orders, kitchen display, and POS register flow.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="chip chip-accent"><span className="dot"/>Realtime · 12 active</span>
          <button className="btn"><I.Refresh size={12}/> Refresh</button>
        </div>
      </div>
      <div className="page-tabs">
        {[
          { id: 'kds', label: 'Kitchen Display', count: 8 },
          { id: 'queue', label: 'Order Queue', count: 12 },
          { id: 'register', label: 'POS Register', count: null },
          { id: 'history', label: 'Order History', count: null },
        ].map(t => (
          <div key={t.id} className={'page-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label} {t.count != null && <span className="count">{t.count}</span>}
          </div>
        ))}
      </div>
      {tab === 'kds' && <KDS/>}
      {tab === 'queue' && <OrderQueue/>}
      {tab === 'register' && <Register/>}
      {tab === 'history' && <OrderHistory/>}
    </div>
  );
};

const KDS = () => {
  const tickets = [
    { id: '#10394', table: 'T-12', age: 132, items: [
      { qty: 1, name: 'Northwind Classic Burger', mods: ['Medium', 'Add cheddar', 'No pickles'] },
      { qty: 2, name: 'Cortado', mods: ['Oat milk'] },
      { qty: 1, name: 'Sparkling Water', mods: [] },
    ], staff: 'Sara · Waiter', status: 'cooking' },
    { id: '#10395', table: '—', age: 38, items: [
      { qty: 1, name: 'Margherita Pizza', mods: ['Extra basil'] },
      { qty: 1, name: 'Coke', mods: [] },
    ], staff: 'QR — table 7', status: 'new' },
    { id: '#10397', table: '—', age: 320, items: [
      { qty: 2, name: 'Double Stack Cheeseburger', mods: ['Medium-rare', 'Add bacon'] },
      { qty: 1, name: 'Pepperoni Pizza', mods: [] },
    ], staff: 'Delivery · DoorDash', status: 'cooking' },
    { id: '#10398', table: 'T-08', age: 480, items: [
      { qty: 1, name: 'Smashed Mushroom Burger', mods: ['Medium-well', 'Swiss'] },
      { qty: 1, name: 'Margherita Pizza', mods: ['No olives'] },
      { qty: 3, name: 'Oat Milk Latte', mods: ['Decaf x1'] },
    ], staff: 'Isabel · Waiter', status: 'late' },
    { id: '#10400', table: 'T-15', age: 12, items: [
      { qty: 2, name: 'Northwind Classic Burger', mods: ['Medium', 'Medium-rare'] },
      { qty: 1, name: 'Margherita Pizza', mods: [] },
    ], staff: 'Diego · Manager', status: 'new' },
    { id: '#10401', table: '—', age: 180, items: [
      { qty: 1, name: 'Double Stack Cheeseburger', mods: ['Hot'] },
      { qty: 1, name: 'Coke', mods: [] },
    ], staff: 'Drive-thru', status: 'ready' },
  ];
  const fmtAge = (s) => s < 60 ? s + 's' : Math.floor(s/60) + 'm ' + (s%60).toString().padStart(2,'0') + 's';
  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignItems: 'start' }}>
      {tickets.map(t => {
        const isLate = t.status === 'late' || t.age > 360;
        const isNew = t.status === 'new';
        const isReady = t.status === 'ready';
        const accent = isLate ? 'var(--danger)' : isReady ? 'var(--accent)' : isNew ? 'var(--info)' : 'oklch(0.65 0.14 70)';
        return (
          <div key={t.id} className="card" style={{ borderTop: '3px solid ' + accent, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{t.id}</div>
              <span className="chip" style={{ fontSize: 10 }}>{t.table === '—' ? 'Off-prem' : t.table}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: accent, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                <I.Clock size={11}/>{fmtAge(t.age)}
              </div>
            </div>
            <div style={{ padding: 10 }}>
              {t.items.map((it, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, fontSize: 13 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>×{it.qty}</span>
                    <span style={{ fontWeight: 500 }}>{it.name}</span>
                  </div>
                  {it.mods.length > 0 && (
                    <div style={{ marginLeft: 22, fontSize: 11, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {it.mods.map((m, j) => <span key={j}>· {m}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
              <span>{t.staff}</span>
              <div style={{ flex: 1 }}/>
              {!isReady && <button className="btn btn-sm" style={{ background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }}>
                <I.Check size={11}/> {isNew ? 'Start' : 'Mark ready'}
              </button>}
              {isReady && <button className="btn btn-sm btn-accent">Bump <I.Check size={11}/></button>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OrderQueue = () => {
  const fmtMoney = (n) => '$' + n.toFixed(2);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr><th>Order</th><th>Channel</th><th>Table</th><th>Items</th><th className="num">Total</th><th>Staff</th><th>Status</th><th>Placed</th><th className="actions-col"></th></tr>
        </thead>
        <tbody>
          {DATA.liveOrders.map(o => (
            <tr key={o.id}>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{o.id}</td>
              <td>{o.channel}</td>
              <td>{o.table}</td>
              <td className="num">{o.items}</td>
              <td className="num" style={{ fontWeight: 500 }}>{fmtMoney(o.total)}</td>
              <td style={{ color: 'var(--muted)' }}>{o.staff}</td>
              <td><OrderStatus s={o.status}/></td>
              <td style={{ color: 'var(--muted)' }}>{o.placed} ago</td>
              <td className="actions-col"><button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Register = () => {
  const [cart, setCart] = React.useState([
    { id: 'P-1024', name: 'Northwind Classic Burger', price: 14.50, qty: 1, mods: [{ name: 'Medium', price: 0 }, { name: 'Add cheddar', price: 1.50 }] },
    { id: 'P-2031', name: 'Oat Milk Latte', price: 5.75, qty: 2, mods: [{ name: 'Decaf', price: 0 }] },
    { id: 'P-3014', name: 'Margherita Pizza', price: 18.00, qty: 1, mods: [] },
  ]);
  const [activeCat, setActiveCat] = React.useState('Burgers');
  const cats = Array.from(new Set(DATA.products.map(p => p.category)));
  const products = DATA.products.filter(p => p.category === activeCat);
  const sub = cart.reduce((s, c) => s + (c.price + c.mods.reduce((a, m) => a + m.price, 0)) * c.qty, 0);
  const tax = sub * 0.08875;
  const tip = sub * 0.18;
  const total = sub + tax + tip;
  const fmt = (n) => '$' + n.toFixed(2);
  const addToCart = (p) => {
    const ex = cart.find(c => c.id === p.id);
    if (ex) setCart(cart.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
    else setCart([...cart, { id: p.id, name: p.name, price: p.price, qty: 1, mods: [] }]);
  };
  const updateQty = (id, d) => setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + d) } : c).filter(c => c.qty > 0));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: 'calc(100vh - 48px - 49px - 38px)', overflow: 'hidden' }}>
      {/* Left: product grid */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {cats.map(c => (
            <button key={c} className="btn btn-sm" style={activeCat === c ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}} onClick={() => setActiveCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} className="prod-card">
                <div style={{ height: 70, background: 'var(--surface-2)', borderRadius: 5, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                  {p.type === 'Restaurant' ? <I.Flame size={22}/> : p.type === 'Cafe' ? <I.Coffee size={22}/> : <I.Shirt size={22}/>}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 500, lineHeight: 1.2, textAlign: 'left' }}>{p.name}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{fmt(p.price)}</span>
                  {p.modifiers > 0 && <span><I.Sliders size={9}/> {p.modifiers}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Right: cart */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.Cart size={14}/>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Order #10402</span>
          <span className="chip" style={{ fontSize: 10 }}>Table 12 · Sara</span>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {cart.map(c => (
            <div key={c.id} style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{c.name}</div>
                  {c.mods.map((m, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                      · {m.name} {m.price > 0 && <span>(+{fmt(m.price)})</span>}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className="btn btn-icon btn-sm" onClick={() => updateQty(c.id, -1)}>−</button>
                  <span className="num" style={{ width: 18, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{c.qty}</span>
                  <button className="btn btn-icon btn-sm" onClick={() => updateQty(c.id, 1)}>+</button>
                </div>
                <span className="num" style={{ width: 56, textAlign: 'right', fontWeight: 500 }}>
                  {fmt((c.price + c.mods.reduce((a,m)=>a+m.price,0)) * c.qty)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
          <Row k="Subtotal" v={fmt(sub)}/>
          <Row k="Tax (8.875%)" v={fmt(tax)} muted/>
          <Row k="Tip (18%)" v={fmt(tip)} muted/>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }}/>
          <Row k="Total" v={fmt(total)} strong/>
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button className="btn">Discount</button>
          <button className="btn">Split</button>
          <button className="btn">Hold</button>
          <button className="btn">Customer</button>
          <button className="btn btn-primary" style={{ gridColumn: 'span 2', height: 36, fontSize: 13 }}>
            Charge {fmt(total)}
          </button>
        </div>
      </div>
      <style>{`
        .prod-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
          padding: 8px; cursor: pointer; font-family: inherit; text-align: left;
        }
        .prod-card:hover { border-color: var(--ink); }
        .prod-card:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
};

const Row = ({ k, v, muted, strong }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0',
    color: muted ? 'var(--muted)' : 'var(--ink)', fontWeight: strong ? 600 : 400, fontSize: strong ? 14 : 12 }}>
    <span>{k}</span><span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
  </div>
);

const OrderHistory = () => (
  <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>
    Showing last 30 days · 8,420 orders · click any row to see receipt, modifiers, payment, refunds.
  </div>
);

window.Orders = Orders;

import React from 'react';

// Live Orders / KDS / Queue / History
const OrdersScreen = () => {
  const { I } = window;
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
          { id: 'history', label: 'Order History', count: null },
        ].map(t => (
          <div key={t.id} className={'page-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label} {t.count != null && <span className="count">{t.count}</span>}
          </div>
        ))}
      </div>
      {tab === 'kds' && <KDS/>}
      {tab === 'queue' && <OrderQueue/>}
      {tab === 'history' && <OrderHistory/>}
    </div>
  );
};

const KDS = () => {
  const { I } = window;
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
  const { DATA, I } = window;
  const OrderStatus = ({ s }) => {
    const map = {
      new: { label: 'New', cls: 'chip-info' },
      preparing: { label: 'Preparing', cls: 'chip-warn' },
      ready: { label: 'Ready', cls: 'chip-accent' },
      served: { label: 'Served', cls: '' },
    };
    const m = map[s] || { label: s, cls: '' };
    return <span className={'chip ' + m.cls}><span className="dot"/>{m.label}</span>;
  };
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

const OrderHistory = () => (
  <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>
    Showing last 30 days · 8,420 orders · click any row to see receipt, modifiers, payment, refunds.
  </div>
);

export default OrdersScreen;

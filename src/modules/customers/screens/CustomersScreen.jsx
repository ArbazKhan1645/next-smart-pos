import React from 'react';

const CustomersScreen = () => {
  const { CUSTOMERS, I } = window;
  const [sel, setSel] = React.useState(CUSTOMERS[0]);
  const tierColor = (t) => ({
    Platinum: 'oklch(0.55 0.05 280)',
    Gold: 'oklch(0.72 0.14 85)',
    Silver: 'oklch(0.65 0.02 250)',
    Bronze: 'oklch(0.60 0.10 50)',
  }[t]);
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub">{CUSTOMERS.length} loyalty members · sorted by recency</p>
        </div>
        <button className="btn btn-sm"><I.Plus size={11}/> Add customer</button>
        <button className="btn btn-primary btn-sm">Export CSV</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th><th>Tier</th><th>Orders</th><th>Spend</th><th>Points</th><th>Last</th>
              </tr>
            </thead>
            <tbody>
              {CUSTOMERS.map(c => (
                <tr key={c.id} onClick={() => setSel(c)} style={{ cursor: 'pointer', background: sel?.id === c.id ? 'var(--surface-2)' : 'transparent' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="sb-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{c.name.split(' ').map(n => n[0]).join('')}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="chip" style={{ color: tierColor(c.tier), borderColor: tierColor(c.tier) }}>{c.tier}</span></td>
                  <td className="num">{c.orders}</td>
                  <td className="num">${c.spend.toLocaleString()}</td>
                  <td className="num">{c.points.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted)' }}>{c.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sel && <div className="card" style={{ padding: 16, alignSelf: 'start', position: 'sticky', top: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div className="sb-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{sel.name.split(' ').map(n => n[0]).join('')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{sel.id}</div>
            </div>
            <span className="chip" style={{ color: tierColor(sel.tier), borderColor: tierColor(sel.tier) }}>{sel.tier}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div className="kpi-mini"><div className="kpi-mini-label">Orders</div><div className="kpi-mini-value">{sel.orders}</div></div>
            <div className="kpi-mini"><div className="kpi-mini-label">Spend</div><div className="kpi-mini-value">${sel.spend.toLocaleString()}</div></div>
            <div className="kpi-mini"><div className="kpi-mini-label">Points</div><div className="kpi-mini-value">{sel.points.toLocaleString()}</div></div>
            <div className="kpi-mini"><div className="kpi-mini-label">Last order</div><div className="kpi-mini-value">{sel.lastOrder}</div></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Contact</div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>{sel.email}</div>
          <div style={{ fontSize: 12, marginBottom: 14, fontFamily: 'var(--font-mono)' }}>{sel.phone}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button className="btn btn-sm">Order history</button>
            <button className="btn btn-sm">Send offer</button>
            <button className="btn btn-sm" style={{ gridColumn: 'span 2' }}>Adjust loyalty</button>
          </div>
        </div>}
      </div>
      <style>{`
        .kpi-mini { background: var(--surface-2); border-radius: 6px; padding: 8px 10px; }
        .kpi-mini-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .kpi-mini-value { font-size: 16px; font-weight: 600; font-family: var(--font-mono); margin-top: 2px; }
      `}</style>
    </div>
  );
};

export default CustomersScreen;

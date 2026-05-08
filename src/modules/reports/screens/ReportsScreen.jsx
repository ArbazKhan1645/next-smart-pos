import React from 'react';

// Reports Screen
const ReportsScreen = () => {
  const { DATA, I, Spark, RevenueChart } = window;
  const [tab, setTab] = React.useState('sales');
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Enterprise analytics across sales, products, staff, taxes and inventory.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn"><I.Calendar size={12} /> Apr 24 – May 7</button>
          <button className="btn"><I.Filter size={12} /> Filters</button>
          <button className="btn"><I.Download size={12} /> Export CSV</button>
          <button className="btn btn-primary"><I.Plus size={12} /> Schedule report</button>
        </div>
      </div>
      <div className="page-tabs">
        {['sales', 'products', 'staff', 'tax', 'inventory', 'customers'].map(id => (
          <div key={id} className={'page-tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </div>
        ))}
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            ['Net Sales', '$184,293', '+12.4%'],
            ['Orders', '2,847', '+8.1%'],
            ['Avg. Ticket', '$64.74', '+3.9%'],
            ['Refund Rate', '0.68%', '-22%'],
          ].map((k, i) => (
            <div key={i} className="kpi">
              <div className="kpi-label">{k[0]}</div>
              <div className="kpi-value">{k[1]}</div>
              <div className="kpi-trend"><span className="delta up">▲ {k[2]}</span><span>vs prev</span></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Sales by location</div>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}><I.Download size={11} /></button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Location</th><th className="num">Orders</th><th className="num">Net sales</th><th className="num">Avg. ticket</th><th className="num">Tax</th><th className="num">Tips</th><th className="num">Refunds</th><th>Trend</th></tr>
              </thead>
              <tbody>
                {DATA.locations.filter(l => l.sales > 0).slice(0, 10).map((l, i) => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{l.code}</div>
                    </td>
                    <td className="num">{Math.floor(l.sales / 64.74)}</td>
                    <td className="num" style={{ fontWeight: 500 }}>${l.sales.toLocaleString()}</td>
                    <td className="num">$64.74</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>${Math.floor(l.sales * 0.0888).toLocaleString()}</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>${Math.floor(l.sales * 0.16).toLocaleString()}</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>${Math.floor(l.sales * 0.007).toLocaleString()}</td>
                    <td>
                      <Spark data={[10, 14, 12, 18, 16, 20, 22, 21, 24, 26, 23, 28].map(v => v + i)} w={80} h={20} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card">
            <div className="card-head"><div className="card-title">Net sales · trend</div></div>
            <div style={{ padding: 14, height: 220 }}><RevenueChart /></div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Tax breakdown</div></div>
            <div style={{ padding: 14 }}>
              {[
                ['Standard NY · 8.875%', 8420, 'var(--accent)'],
                ['Standard MA · 6.25%', 1240, 'oklch(0.65 0.14 200)'],
                ['Standard IL · 10.25%', 2310, 'oklch(0.70 0.15 70)'],
                ['Standard CA · 9.5%', 1820, 'oklch(0.55 0.18 290)'],
                ['Beverage Tax · 1%', 420, 'oklch(0.60 0.18 25)'],
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 12, borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 8, height: 8, background: r[2], borderRadius: 2 }} />
                  <span style={{ flex: 1 }}>{r[0]}</span>
                  <span className="num" style={{ fontWeight: 500 }}>${r[1].toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;

import React from 'react';

// Dashboard page
const DashboardScreen = () => {
  const { DATA, I, Spark } = window;
  const fmt = (n) => n.toLocaleString('en-US');
  const fmtMoney = (n) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const maxHourly = Math.max(...DATA.hourly.map(h => h.v));
  return (
    <div className="dash">
      <div className="dash-grid">
        {DATA.kpis.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">
              {k.currency && <span className="currency">{k.currency}</span>}
              {fmt(k.value)}
            </div>
            <div className="kpi-trend">
              <span className={'delta ' + k.dir}>
                {k.dir === 'up' ? '▲' : '▼'} {k.delta}
              </span>
              <span>vs last week</span>
            </div>
            <Spark data={k.spark}/>
          </div>
        ))}
      </div>

      <div className="dash-row">
        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Revenue · last 14 days</div>
              <div className="card-sub">All locations · 5min granularity</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">14d</button>
              <button className="btn btn-sm" style={{ background: 'var(--surface-2)' }}>30d</button>
              <button className="btn btn-sm">90d</button>
              <button className="btn btn-sm"><I.Download size={11}/></button>
            </div>
          </div>
          <div style={{ padding: 14, height: 240, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <RevenueChart/>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-head">
            <div className="card-title">Sales by channel</div>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}><I.More size={12}/></button>
          </div>
          <div style={{ padding: 14 }}>
            <DonutChart data={DATA.channels}/>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DATA.channels.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }}/>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-row">
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-head">
            <div className="card-title">Peak hours · today</div>
            <span className="chip chip-accent" style={{ marginLeft: 'auto' }}><I.Flame size={10}/> 7p peak</span>
          </div>
          <div style={{ padding: '14px 14px 18px', height: 160 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
              {DATA.hourly.map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', background: i === 10 ? 'var(--accent)' : 'oklch(0.85 0.05 145)',
                    height: `${(h.v / maxHourly) * 100}%`, borderRadius: '3px 3px 0 0'
                  }}/>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{h.h}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-head">
            <div className="card-title">Top products</div>
            <span className="card-sub" style={{ marginLeft: 8 }}>by units sold</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>View all <I.Chevron size={11}/></button>
          </div>
          <div>
            {DATA.topProducts.map((p, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr 80px 80px 80px',
                gap: 12, alignItems: 'center', padding: '8px 14px',
                borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 12
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11 }}>{i + 1}</span>
                <span>{p.name}</span>
                <span style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <span style={{ display: 'block', width: p.share + '%', height: '100%', background: 'var(--accent)' }}/>
                </span>
                <span className="num" style={{ color: 'var(--muted)' }}>{p.sales}</span>
                <span className="num" style={{ fontWeight: 500 }}>{fmtMoney(p.rev)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-row">
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-head">
            <div className="card-title">Live orders</div>
            <span className="chip chip-accent" style={{ marginLeft: 8 }}>
              <span className="dot" style={{ background: 'var(--accent)', animation: 'pulse 2s infinite' }}/>
              12 active
            </span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>Open KDS <I.Chevron size={11}/></button>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th><th>Channel</th><th>Items</th><th className="num">Total</th><th>Status</th><th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {DATA.liveOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{o.id}</td>
                    <td>{o.channel}</td>
                    <td className="num">{o.items}</td>
                    <td className="num">{fmtMoney(o.total)}</td>
                    <td><OrderStatus s={o.status}/></td>
                    <td style={{ color: 'var(--muted)' }}>{o.placed} ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-head">
            <div className="card-title">Terminal health</div>
            <span className="card-sub" style={{ marginLeft: 8 }}>47 devices</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}><I.Refresh size={11}/></button>
          </div>
          <div style={{ padding: '8px 14px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {Array.from({ length: 47 }).map((_, i) => {
              const s = i === 5 ? 'offline' : (i === 12 || i === 22 ? 'syncing' : 'online');
              const bg = s === 'online' ? 'var(--accent)' : s === 'syncing' ? 'var(--warn)' : 'var(--danger)';
              return <div key={i} title={'T-100' + i + ' · ' + s}
                style={{ aspectRatio: 1, background: bg, opacity: s === 'online' ? 0.85 : 1, borderRadius: 3 }}/>;
            })}
          </div>
          <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 14, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }}/>
              <span style={{ color: 'var(--muted)' }}>Online</span>
              <strong>44</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: 'var(--warn)', borderRadius: 2 }}/>
              <span style={{ color: 'var(--muted)' }}>Syncing</span>
              <strong>2</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: 'var(--danger)', borderRadius: 2 }}/>
              <span style={{ color: 'var(--muted)' }}>Offline</span>
              <strong>1</strong>
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .dash { padding: 16px 20px 32px; display: flex; flex-direction: column; gap: 14px; }
        .dash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .dash-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
        @media (max-width: 1100px) {
          .dash-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-row > .card { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  );
};

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

// Revenue chart — 14 days of bars, 24 segments per day
const RevenueChart = () => {
  const days = 14;
  const baseline = [38, 42, 45, 50, 55, 75, 82, 48, 52, 58, 62, 68, 88, 95];
  return (
    <svg viewBox="0 0 700 220" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="rg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.17 145)" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="oklch(0.62 0.17 145)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1="0" x2="700" y1={i * 50 + 10} y2={i * 50 + 10}
          stroke="var(--border)" strokeDasharray="2 4"/>
      ))}
      {(() => {
        const pts = baseline.map((v, i) => `${(i / (days - 1)) * 700},${220 - v * 1.8}`).join(' ');
        const area = `0,220 ${pts} 700,220`;
        return (<>
          <polygon points={area} fill="url(#rg)"/>
          <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.6"/>
          {baseline.map((v, i) => (
            <circle key={i} cx={(i / (days - 1)) * 700} cy={220 - v * 1.8} r="2.5" fill="white" stroke="var(--accent)" strokeWidth="1.5"/>
          ))}
        </>);
      })()}
      <text x="0" y="216" fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">Apr 24</text>
      <text x="660" y="216" fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">May 7</text>
    </svg>
  );
};

const DonutChart = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const cx = 80, cy = 80, r = 60, sw = 18;
  const C = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
      <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={sw}/>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const offset = -acc * C;
          acc += frac;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
              strokeWidth={sw} strokeDasharray={`${dash} ${C}`} strokeDashoffset={offset}/>
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>2,847</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>orders today</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;

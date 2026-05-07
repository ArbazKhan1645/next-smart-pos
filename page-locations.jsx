// Locations / Terminals / Staff
const Locations = () => {
  const [tab, setTab] = React.useState('locations');
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Operations</h1>
          <p className="page-sub">Locations, terminals, staff and printers across the Northwind network.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn"><I.Download size={12}/> Export</button>
          <button className="btn btn-primary"><I.Plus size={12}/> Add location</button>
        </div>
      </div>
      <div className="page-tabs">
        {[
          { id: 'locations', label: 'Locations', count: DATA.locations.length },
          { id: 'terminals', label: 'Terminals', count: DATA.terminals.length },
          { id: 'staff', label: 'Staff', count: DATA.staff.length },
          { id: 'printers', label: 'Printers', count: 18 },
          { id: 'channels', label: 'Sales Channels', count: 6 },
        ].map(t => (
          <div key={t.id} className={'page-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label} <span className="count">{t.count}</span>
          </div>
        ))}
      </div>
      {tab === 'locations' && <LocationsView/>}
      {tab === 'terminals' && <TerminalsView/>}
      {tab === 'staff' && <StaffView/>}
      {tab === 'printers' && <PrintersView/>}
      {tab === 'channels' && <ChannelsView/>}
    </div>
  );
};

const LocationsView = () => {
  const [view, setView] = React.useState('list');
  const fmtMoney = (n) => '$' + n.toLocaleString('en-US');
  return (
    <>
      <div className="toolbar">
        <div className="toolbar-search"><I.Search size={12}/><input placeholder="Search locations…"/></div>
        <button className="btn btn-sm">Region: All</button>
        <button className="btn btn-sm">Status: All</button>
        <button className="btn btn-sm">Type: All</button>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <button className={'btn btn-sm' + (view === 'list' ? '' : ' btn-ghost')} onClick={() => setView('list')} style={{ border: 'none', borderRadius: 0 }}>List</button>
          <button className={'btn btn-sm' + (view === 'grid' ? '' : ' btn-ghost')} onClick={() => setView('grid')} style={{ border: 'none', borderRadius: 0 }}>Grid</button>
          <button className={'btn btn-sm' + (view === 'map' ? '' : ' btn-ghost')} onClick={() => setView('map')} style={{ border: 'none', borderRadius: 0 }}>Map</button>
        </div>
      </div>
      {view === 'list' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Location</th><th>Code</th><th>Type</th><th>Status</th>
                <th className="num">Terminals</th><th className="num">Staff</th>
                <th className="num">Today's sales</th><th>Channels</th><th className="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              {DATA.locations.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.city}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11 }}>{l.code}</td>
                  <td>{l.type}</td>
                  <td>
                    {l.status === 'open' && <span className="chip chip-accent"><span className="dot"/>Open</span>}
                    {l.status === 'closed' && <span className="chip"><span className="dot"/>Closed</span>}
                    {l.status === 'syncing' && <span className="chip chip-warn"><span className="dot"/>Syncing</span>}
                    {l.status === 'maintenance' && <span className="chip chip-danger"><span className="dot"/>Maintenance</span>}
                  </td>
                  <td className="num">{l.terminals}</td>
                  <td className="num">{l.staff}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{l.sales > 0 ? fmtMoney(l.sales) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {l.channels.slice(0, 2).map(c => <span key={c} className="chip" style={{ fontSize: 10 }}>{c}</span>)}
                      {l.channels.length > 2 && <span className="chip" style={{ fontSize: 10 }}>+{l.channels.length - 2}</span>}
                    </div>
                  </td>
                  <td className="actions-col"><button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === 'grid' && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {DATA.locations.map(l => (
            <div key={l.id} className="card">
              <div style={{ height: 90, background: 'linear-gradient(135deg, oklch(0.95 0.02 145), oklch(0.92 0.04 145))', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, left: 10, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{l.code}</div>
                <div style={{ position: 'absolute', top: 8, right: 10 }}>
                  {l.status === 'open' && <span className="chip chip-accent" style={{ fontSize: 10 }}>Open</span>}
                  {l.status === 'closed' && <span className="chip" style={{ fontSize: 10 }}>Closed</span>}
                  {l.status === 'syncing' && <span className="chip chip-warn" style={{ fontSize: 10 }}>Sync</span>}
                  {l.status === 'maintenance' && <span className="chip chip-danger" style={{ fontSize: 10 }}>Maint.</span>}
                </div>
                <I.Building size={32} style={{ position: 'absolute', bottom: 10, left: 10, color: 'oklch(0.55 0.10 145)', opacity: 0.4 }}/>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 500 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{l.city}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                  <div><div style={{ color: 'var(--muted)' }}>Terminals</div><div style={{ fontWeight: 500, fontSize: 13 }}>{l.terminals}</div></div>
                  <div><div style={{ color: 'var(--muted)' }}>Staff</div><div style={{ fontWeight: 500, fontSize: 13 }}>{l.staff}</div></div>
                  <div><div style={{ color: 'var(--muted)' }}>Sales</div><div style={{ fontWeight: 500, fontSize: 13 }}>{l.sales > 0 ? fmtMoney(l.sales) : '—'}</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {view === 'map' && (
        <div style={{ padding: 16 }}>
          <div className="card" style={{ height: 520, position: 'relative', background: 'linear-gradient(180deg, oklch(0.97 0.01 220), oklch(0.95 0.01 145))', overflow: 'hidden' }}>
            {/* Stylized US map dots */}
            <svg viewBox="0 0 800 400" style={{ width: '100%', height: '100%' }}>
              <defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.5"/>
              </pattern></defs>
              <rect width="800" height="400" fill="url(#g)"/>
              <path d="M 100 120 Q 200 80 350 110 Q 500 140 650 100 L 700 200 Q 600 280 500 260 Q 350 280 200 250 Q 100 220 100 120 Z"
                fill="oklch(0.94 0.02 145)" stroke="var(--border-strong)" strokeWidth="1"/>
              {DATA.locations.map((l, i) => {
                const x = 120 + (i % 6) * 110 + Math.sin(i) * 20;
                const y = 130 + Math.floor(i / 6) * 80 + Math.cos(i) * 15;
                return (
                  <g key={l.id} transform={`translate(${x}, ${y})`}>
                    <circle r="14" fill="var(--accent)" opacity="0.15"/>
                    <circle r="6" fill={l.status === 'open' ? 'var(--accent)' : l.status === 'syncing' ? 'oklch(0.72 0.16 70)' : 'var(--danger)'} stroke="white" strokeWidth="2"/>
                    <text y="-10" fontSize="9" textAnchor="middle" fill="var(--ink)" fontFamily="var(--font-mono)">{l.code}</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'var(--surface)', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, display: 'flex', gap: 12 }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', marginRight: 4 }}/>Open · 9</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'oklch(0.72 0.16 70)', marginRight: 4 }}/>Syncing · 1</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--danger)', marginRight: 4 }}/>Issue · 2</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const TerminalsView = () => (
  <div style={{ overflowX: 'auto' }}>
    <table className="table">
      <thead>
        <tr><th>Terminal</th><th>ID</th><th>Location</th><th>Device</th><th>IP</th><th>Battery</th><th>Printer</th><th>Status</th><th className="actions-col"></th></tr>
      </thead>
      <tbody>
        {DATA.terminals.map(t => (
          <tr key={t.id}>
            <td><div style={{ fontWeight: 500 }}>{t.name}</div></td>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{t.id}</td>
            <td>{t.loc}</td>
            <td style={{ color: 'var(--muted)' }}>{t.device}</td>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{t.ip}</td>
            <td>
              {t.battery == null ? <span style={{ color: 'var(--muted-2)' }}>—</span> : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 36, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: t.battery + '%', height: '100%',
                      background: t.battery < 20 ? 'var(--danger)' : t.battery < 50 ? 'oklch(0.72 0.16 70)' : 'var(--accent)' }}/>
                  </div>
                  <span className="num" style={{ fontSize: 11 }}>{t.battery}%</span>
                </div>
              )}
            </td>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{t.printer}</td>
            <td>
              {t.status === 'online' && <span className="chip chip-accent"><I.Wifi size={10}/>Online</span>}
              {t.status === 'syncing' && <span className="chip chip-warn"><I.Refresh size={10}/>Syncing</span>}
              {t.status === 'offline' && <span className="chip chip-danger"><I.WifiOff size={10}/>Offline</span>}
            </td>
            <td className="actions-col"><button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StaffView = () => {
  const [role, setRole] = React.useState('All');
  const filtered = role === 'All' ? DATA.staff : DATA.staff.filter(s => s.role === role);
  const fmtAgo = (m) => m == null ? '—' : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h';
  const roles = ['All','Admin','Manager','Cashier','Kitchen','Waiter','Support'];
  return (
    <>
      <div className="toolbar">
        <div className="toolbar-search"><I.Search size={12}/><input placeholder="Search staff…"/></div>
        {roles.map(r => (
          <button key={r} className="btn btn-sm" style={role === r ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}}
            onClick={() => setRole(r)}>{r}</button>
        ))}
        <div style={{ flex: 1 }}/>
        <button className="btn btn-sm btn-primary"><I.Plus size={11}/> Invite staff</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr><th>Staff</th><th>Role</th><th>Location</th><th>Clock</th><th>Last activity</th><th>Status</th><th className="actions-col"></th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="sb-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                      {s.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="chip">{s.role}</span></td>
                <td>{s.loc}</td>
                <td>
                  {s.clockedIn
                    ? <span className="chip chip-accent"><span className="dot"/>Clocked in</span>
                    : <span className="chip"><span className="dot"/>Off</span>}
                </td>
                <td style={{ color: 'var(--muted)' }}>{s.lastSale != null ? fmtAgo(s.lastSale) + ' ago' : '—'}</td>
                <td>
                  {s.status === 'active' && <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>Active</span>}
                  {s.status === 'invited' && <span style={{ color: 'oklch(0.55 0.14 70)', fontSize: 11, fontWeight: 500 }}>Invited</span>}
                </td>
                <td className="actions-col"><button className="btn btn-ghost btn-icon btn-sm"><I.More size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const PrintersView = () => (
  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
    {[
      { name: 'Kitchen — Hot Line', id: 'EPSON-TM82-A', loc: 'SoHo', status: 'online', queue: 0, routed: 24 },
      { name: 'Kitchen — Cold Prep', id: 'STAR-TSP143', loc: 'SoHo', status: 'online', queue: 2, routed: 12 },
      { name: 'Bar Receipt', id: 'EPSON-TM30', loc: 'SoHo', status: 'online', queue: 0, routed: 8 },
      { name: 'Drive-thru', id: 'EPSON-TM82-CHI', loc: 'Chicago', status: 'low-paper', queue: 1, routed: 18 },
      { name: 'Patio Receipt', id: 'BIXOLON-SPP', loc: 'Miami', status: 'offline', queue: 5, routed: 6 },
      { name: 'Counter Receipt', id: 'STAR-TSP100', loc: 'Brooklyn', status: 'online', queue: 0, routed: 14 },
    ].map((p, i) => (
      <div key={i} className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--surface-2)', borderRadius: 6, display: 'grid', placeItems: 'center' }}>
            <I.Printer size={16}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.id}</div>
          </div>
          {p.status === 'online' && <span className="chip chip-accent"><span className="dot"/>OK</span>}
          {p.status === 'low-paper' && <span className="chip chip-warn"><span className="dot"/>Low paper</span>}
          {p.status === 'offline' && <span className="chip chip-danger"><span className="dot"/>Offline</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
          <div><div style={{ color: 'var(--muted)' }}>Location</div><div>{p.loc}</div></div>
          <div><div style={{ color: 'var(--muted)' }}>Queue</div><div>{p.queue}</div></div>
          <div><div style={{ color: 'var(--muted)' }}>Routed</div><div>{p.routed} items</div></div>
        </div>
      </div>
    ))}
  </div>
);

const ChannelsView = () => (
  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
    {DATA.channels.map(c => (
      <div key={c.name} className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, background: c.color, borderRadius: 6, opacity: 0.18 }}/>
          <div>
            <div style={{ fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.value}% of orders</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>Service charge · Tax inclusive · Auto-route to kitchen</div>
      </div>
    ))}
  </div>
);

window.Locations = Locations;

import React from 'react';
// Customers, Settings, and Group management pages

const CustomersPage = () => {
  const [sel, setSel] = React.useState(window.CUSTOMERS[0]);
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
          <p className="page-sub">{window.CUSTOMERS.length} loyalty members · sorted by recency</p>
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
              {window.CUSTOMERS.map(c => (
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

const SettingsPage = () => {
  const [tab, setTab] = React.useState('workspace');
  const tabs = [
    { id: 'workspace', label: 'Workspace', icon: 'Building' },
    { id: 'billing', label: 'Billing', icon: 'Receipt' },
    { id: 'integrations', label: 'Integrations', icon: 'Layers' },
    { id: 'tax', label: 'Tax & Receipts', icon: 'Receipt' },
    { id: 'security', label: 'Security', icon: 'Lock' },
    { id: 'audit', label: 'Audit log', icon: 'Clock' },
  ];
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Workspace, billing, integrations, tax, security · last edited 2h ago by Maya Chen</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        <div>
          {tabs.map(t => {
            const Ico = I[t.icon];
            const active = tab === t.id;
            return (
              <div key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  fontSize: 12, fontWeight: 500, borderRadius: 5, cursor: 'pointer',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  marginBottom: 2,
                }}>
                <Ico size={13}/> {t.label}
              </div>
            );
          })}
        </div>
        <div>
          {tab === 'workspace' && <SettingsWorkspace/>}
          {tab === 'billing' && <SettingsBilling/>}
          {tab === 'integrations' && <SettingsIntegrations/>}
          {tab === 'tax' && <SettingsTax/>}
          {tab === 'security' && <SettingsSecurity/>}
          {tab === 'audit' && <SettingsAudit/>}
        </div>
      </div>
    </div>
  );
};

const SettingField = ({ label, hint, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
    <div>
      <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);
const Inp = (p) => <input {...p} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', ...p.style }}/>;

const SettingsWorkspace = () => (
  <div className="card" style={{ padding: '0 18px' }}>
    <SettingField label="Workspace name" hint="Shown on receipts and admin"><Inp defaultValue="Northwind Hospitality"/></SettingField>
    <SettingField label="Legal entity" hint="Company name on tax filings"><Inp defaultValue="Northwind Hospitality, LLC"/></SettingField>
    <SettingField label="Tax ID" hint="EIN / VAT number"><Inp defaultValue="86-3194057" style={{ fontFamily: 'var(--font-mono)' }}/></SettingField>
    <SettingField label="Currency" hint="Default for new locations">
      <select style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, background: 'var(--surface)' }}>
        <option>USD — US Dollar</option><option>EUR — Euro</option><option>GBP — Pound</option>
      </select>
    </SettingField>
    <SettingField label="Time zone"><Inp defaultValue="America/New_York"/></SettingField>
    <SettingField label="Plan" hint="Enterprise · 14 locations">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="chip chip-accent">Enterprise</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>$2,840 / mo · renews Apr 14</span>
        <button className="btn btn-sm">Manage plan</button>
      </div>
    </SettingField>
    <SettingField label="Danger zone" hint="Permanent actions">
      <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}>Delete workspace…</button>
    </SettingField>
  </div>
);

const SettingsBilling = () => (
  <div className="card" style={{ padding: '0 18px' }}>
    <SettingField label="Payment method" hint="Charged on the 1st of each month">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 5 }}>
        <div style={{ width: 32, height: 22, background: 'var(--ink)', borderRadius: 3, display: 'grid', placeItems: 'center', fontSize: 9, color: '#fff', fontWeight: 600 }}>VISA</div>
        <div style={{ flex: 1, fontSize: 12 }}>•••• 4218 · expires 09/27</div>
        <button className="btn btn-sm">Replace</button>
      </div>
    </SettingField>
    <SettingField label="Billing email"><Inp defaultValue="billing@northwind.co"/></SettingField>
    <SettingField label="Invoices">
      <table className="data-table" style={{ marginTop: -4 }}>
        <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {[['Mar 1, 2026','$2,840.00','Paid'],['Feb 1, 2026','$2,840.00','Paid'],['Jan 1, 2026','$2,690.00','Paid']].map((r, i) => (
            <tr key={i}><td>{r[0]}</td><td className="num">{r[1]}</td><td><span className="chip chip-accent">{r[2]}</span></td><td><a href="#" style={{ color: 'var(--ink)', fontSize: 11 }}>Download</a></td></tr>
          ))}
        </tbody>
      </table>
    </SettingField>
  </div>
);

const SettingsIntegrations = () => {
  const ints = [
    { name: 'Stripe', desc: 'Card processing · saved cards', status: 'Connected', color: '#635bff' },
    { name: 'Square', desc: 'Hardware + alt processing', status: 'Connected', color: '#000' },
    { name: 'DoorDash Drive', desc: 'On-demand delivery', status: 'Connected', color: '#ef2424' },
    { name: 'Uber Eats', desc: 'Delivery marketplace', status: 'Connected', color: '#06c167' },
    { name: 'QuickBooks', desc: 'Accounting sync', status: 'Connected', color: '#2ca01c' },
    { name: 'Mailchimp', desc: 'Loyalty emails', status: 'Not connected', color: '#ffe01b' },
    { name: 'Slack', desc: 'Order alerts', status: 'Not connected', color: '#4a154b' },
    { name: 'Zapier', desc: '5000+ app webhooks', status: 'Not connected', color: '#ff4a00' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
      {ints.map((i, idx) => (
        <div key={idx} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: i.color, borderRadius: 6, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 600, fontSize: 11 }}>{i.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{i.desc}</div>
          </div>
          {i.status === 'Connected'
            ? <span className="chip chip-accent"><span className="dot"/>Connected</span>
            : <button className="btn btn-sm">Connect</button>}
        </div>
      ))}
    </div>
  );
};

const SettingsTax = () => (
  <div className="card" style={{ padding: '0 18px' }}>
    <SettingField label="Default tax rate" hint="Applied unless overridden per-location">
      <Inp defaultValue="8.875" style={{ width: 120, fontFamily: 'var(--font-mono)' }}/>
      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>%</span>
    </SettingField>
    <SettingField label="Tax-inclusive pricing" hint="Show prices including tax on receipts">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <input type="checkbox"/> Enabled
      </label>
    </SettingField>
    <SettingField label="Receipt header"><Inp defaultValue="Northwind Hospitality"/></SettingField>
    <SettingField label="Receipt footer"><Inp defaultValue="Thank you — see you again soon"/></SettingField>
    <SettingField label="Print logo">
      <div style={{ width: 80, height: 80, background: 'var(--surface-2)', borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700 }}>N</div>
    </SettingField>
  </div>
);

const SettingsSecurity = () => (
  <div className="card" style={{ padding: '0 18px' }}>
    <SettingField label="Two-factor authentication" hint="Required for Admin/Manager roles">
      <span className="chip chip-accent"><span className="dot"/>Enforced</span>
    </SettingField>
    <SettingField label="Session timeout" hint="Auto-lock after inactivity">
      <Inp defaultValue="15" style={{ width: 80, fontFamily: 'var(--font-mono)' }}/>
      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>minutes</span>
    </SettingField>
    <SettingField label="Staff PIN length"><Inp defaultValue="4" style={{ width: 80, fontFamily: 'var(--font-mono)' }}/></SettingField>
    <SettingField label="Failed PIN lockout">
      <Inp defaultValue="5" style={{ width: 80, fontFamily: 'var(--font-mono)' }}/>
      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>attempts → 10 min lock</span>
    </SettingField>
    <SettingField label="API keys">
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', padding: 10, background: 'var(--surface-2)', borderRadius: 5, marginBottom: 6 }}>sk_live_••••••••••••f3a8</div>
      <button className="btn btn-sm">Rotate key</button>
    </SettingField>
  </div>
);

const SettingsAudit = () => {
  const events = [
    { who: 'Maya Chen', what: 'Updated tax rate to 8.875%', when: '2h', kind: 'config' },
    { who: 'Diego Ramirez', what: 'Voided order #10381 ($86.40)', when: '5h', kind: 'override' },
    { who: 'System', what: 'Daily sync completed · 14 locations', when: '8h', kind: 'system' },
    { who: 'Yuki Tanaka', what: 'Logged in from new device (LA — Abbot Kinney)', when: '11h', kind: 'auth' },
    { who: 'Maya Chen', what: 'Approved refund #RF-2042 ($24.50)', when: '1d', kind: 'override' },
    { who: 'Priya Patel', what: 'Clocked in (Flagship — SoHo)', when: '1d', kind: 'shift' },
  ];
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>Who</th><th>Action</th><th>Type</th><th>When</th></tr></thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{e.who}</td>
              <td>{e.what}</td>
              <td><span className="chip">{e.kind}</span></td>
              <td style={{ color: 'var(--muted)' }}>{e.when} ago</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Groups management — for assigning products to modifier and meal-deal groups
const GroupsPage = ({ kind }) => {
  const groups = kind === 'deals' ? window.DEAL_GROUPS : DATA.modifierGroups;
  const [sel, setSel] = React.useState(groups[0]);
  // products linked to this group
  const linkedProducts = React.useMemo(() => {
    if (!sel) return [];
    const key = kind === 'deals' ? 'dealGroups' : 'modGroups';
    return Object.entries(window.PRODUCT_GROUPS)
      .filter(([_, g]) => (g[key] || []).includes(sel.id))
      .map(([pid]) => [...DATA.products, ...window.DEAL_PRODUCTS].find(p => p.id === pid))
      .filter(Boolean);
  }, [sel, kind]);
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{kind === 'deals' ? 'Meal Deal Groups' : 'Modifier Groups'}</h1>
          <p className="page-sub">
            {kind === 'deals'
              ? 'Bundles with min/max sub-product rules. Link a deal-trigger product to a group; cart opens the builder when added.'
              : 'Reusable customization sets (cooking, milk, toppings). Attach to many products; cart applies min/max rules at add-time.'}
          </p>
        </div>
        <button className="btn btn-sm"><I.Plus size={11}/> New {kind === 'deals' ? 'deal group' : 'modifier group'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          {groups.map(g => {
            const active = sel?.id === g.id;
            return (
              <div key={g.id} onClick={() => setSel(g)}
                style={{
                  padding: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  borderLeft: active ? '2px solid var(--ink)' : '2px solid transparent',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{g.id}</div>
                  </div>
                  {kind === 'deals'
                    ? <span className="chip">${g.dealPrice?.toFixed(2)}</span>
                    : g.required ? <span className="chip chip-info">Required</span> : <span className="chip">Optional</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                  {kind === 'deals'
                    ? <>{g.subProducts.length} sub-groups · {g.available}</>
                    : <>min {g.min} · max {g.max} · {g.items?.length || 0} items</>}
                </div>
              </div>
            );
          })}
        </div>
        {sel && <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{sel.id}</div>
            </div>
            <div style={{ flex: 1 }}/>
            <button className="btn btn-sm"><I.Edit size={11}/> Edit</button>
          </div>

          {kind === 'deals' ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Sub-product groups</div>
              {sel.subProducts.map((s, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.groupName}</div>
                    <span className="chip">{s.min === s.max ? `Pick ${s.min}` : `Pick ${s.min}–${s.max}`}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.options.map(o => (
                      <span key={o.id} className="chip" style={{ fontSize: 11 }}>
                        {o.name}{o.upcharge > 0 && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}> +${o.upcharge.toFixed(2)}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <Stat2 k="Min" v={sel.min}/>
                <Stat2 k="Max" v={sel.max}/>
                <Stat2 k="Required" v={sel.required ? 'Yes' : 'No'}/>
                <Stat2 k="Items" v={sel.items?.length || 0}/>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Items</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                {(sel.items || []).map((item, i) => (
                  <span key={i} className="chip" style={{ fontSize: 11 }}>{item}</span>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Linked products</div>
              <span className="chip">{linkedProducts.length}</span>
              <div style={{ flex: 1 }}/>
              <button className="btn btn-sm"><I.Plus size={11}/> Link product</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
              {linkedProducts.map(p => (
                <div key={p.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: 'var(--surface-2)', borderRadius: 4, display: 'grid', placeItems: 'center' }}>
                    <I.Box size={13}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.id}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm"><I.X size={11}/></button>
                </div>
              ))}
              {linkedProducts.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12, padding: 12 }}>No products linked yet.</div>}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
};

const Stat2 = ({ k, v }) => (
  <div style={{ background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 5 }}>
    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
    <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{v}</div>
  </div>
);




export { CustomersPage, SettingsPage, GroupsPage };

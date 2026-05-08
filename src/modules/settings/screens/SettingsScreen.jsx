import React from 'react';

const SettingsScreen = () => {
  const { I } = window;
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

export default SettingsScreen;

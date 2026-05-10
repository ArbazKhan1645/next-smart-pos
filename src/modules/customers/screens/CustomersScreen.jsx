import React from 'react';
import { CUSTOMERS } from '../../../data/index.jsx';

// tier uuid → display label + color
const TIER_MAP = {
  'tier-uuid-platinum': { label: 'Platinum', color: 'oklch(0.55 0.05 280)' },
  'tier-uuid-gold':     { label: 'Gold',     color: 'oklch(0.72 0.14 85)'  },
  'tier-uuid-silver':   { label: 'Silver',   color: 'oklch(0.65 0.02 250)' },
  'tier-uuid-bronze':   { label: 'Bronze',   color: 'oklch(0.60 0.10 50)'  },
};

const fullName = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';
const initials = (c) => [c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
const tier = (c) => TIER_MAP[c.custom_tier_uuid] || { label: 'Member', color: 'var(--muted)' };

const CustomersScreen = () => {
  const { I } = window;
  const [sel, setSel] = React.useState(CUSTOMERS[0]);
  const [search, setSearch] = React.useState('');

  const filtered = CUSTOMERS.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return fullName(c).toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.phone || '').includes(q);
  });

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
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div className="toolbar-search" style={{ maxWidth: 320 }}>
              <I.Search size={12}/>
              <input
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Tier</th>
                <th>Phone</th>
                <th>City</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const t = tier(c);
                return (
                  <tr key={c.uuid} onClick={() => setSel(c)}
                    style={{ cursor: 'pointer', background: sel?.uuid === c.uuid ? 'var(--surface-2)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="sb-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(c)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{fullName(c)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="chip" style={{ color: t.color, borderColor: t.color }}>{t.label}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{c.phone || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{c.city || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{c.customer_type_id === 1 ? 'Individual' : 'Corporate'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sel && (
          <CustomerDetail customer={sel} onClose={() => setSel(null)}/>
        )}
      </div>
      <style>{`
        .kpi-mini { background: var(--surface-2); border-radius: 6px; padding: 8px 10px; }
        .kpi-mini-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .kpi-mini-value { font-size: 16px; font-weight: 600; font-family: var(--font-mono); margin-top: 2px; }
      `}</style>
    </div>
  );
};

const CustomerDetail = ({ customer: c, onClose }) => {
  const { I } = window;
  const t = tier(c);
  const address = [c.building_number, c.street, c.city, c.zip_or_postal_code].filter(Boolean).join(', ');

  return (
    <div className="card" style={{ padding: 16, alignSelf: 'start', position: 'sticky', top: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div className="sb-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{initials(c)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{fullName(c)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{c.uuid}</div>
        </div>
        <span className="chip" style={{ color: t.color, borderColor: t.color }}>{t.label}</span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Contact</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, fontSize: 12 }}>
        {c.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <I.Mail size={11} style={{ color: 'var(--muted)', flexShrink: 0 }}/>
            {c.email}
          </div>
        )}
        {c.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <I.Phone size={11} style={{ color: 'var(--muted)', flexShrink: 0 }}/>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{c.phone}</span>
          </div>
        )}
        {address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <I.MapPin size={11} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 1 }}/>
            <span style={{ color: 'var(--muted)' }}>{address}</span>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Account</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, fontSize: 11, color: 'var(--muted)' }}>
        <div>Location ID: <strong style={{ color: 'var(--ink)' }}>{c.location_id ?? '—'}</strong></div>
        <div>Country ID: <strong style={{ color: 'var(--ink)' }}>{c.country_id ?? '—'}</strong></div>
        <div>Type: <strong style={{ color: 'var(--ink)' }}>{c.customer_type_id === 1 ? 'Individual' : 'Corporate'}</strong></div>
        <div>Default: <strong style={{ color: 'var(--ink)' }}>{c.is_default ? 'Yes' : 'No'}</strong></div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Member since</div>
      <div style={{ fontSize: 12, marginBottom: 14 }}>
        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Last updated</div>
      <div style={{ fontSize: 12, marginBottom: 16 }}>
        {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button className="btn btn-sm">Order history</button>
        <button className="btn btn-sm">Send offer</button>
        <button className="btn btn-sm" style={{ gridColumn: 'span 2' }}>Adjust loyalty tier</button>
      </div>
    </div>
  );
};

export default CustomersScreen;

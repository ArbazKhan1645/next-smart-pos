import React from 'react';
import { I } from '../icons';

// Sidebar component
const Sidebar = ({ route, setRoute, collapsed }) => {
  const [open, setOpen] = React.useState({ catalog: true, ops: true });
  const Item = ({ id, icon, label, badge, badgeKind, route: r, indent }) => {
    const Icon = I[icon];
    const active = route === (r || id);
    return (
      <div className={'nav-item' + (active ? ' active' : '')}
        onClick={() => setRoute(r || id)}
        style={indent ? { paddingLeft: 22 } : null}
        title={collapsed ? label : ''}>
        {Icon && <Icon/>}
        <span className="nav-item-label">{label}</span>
        {badge != null && <span className={'nav-item-badge' + (badgeKind ? ' ' + badgeKind : '')}>{badge}</span>}
      </div>
    );
  };
  const Group = ({ id, label, children }) => (
    <div>
      <div className="nav-item" onClick={() => setOpen({ ...open, [id]: !open[id] })}>
        <I.Chevron className={'nav-chev' + (open[id] ? ' open' : '')}/>
        <span className="nav-item-label" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      {open[id] && <div className="nav-children">{children}</div>}
    </div>
  );
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">S</div>
        <div className="sb-brand-name">Smart POS</div>
        {!collapsed && <div className="sb-tenant" title="Switch workspace">
          <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>Northwind</span>
          <I.ChevronD size={11}/>
        </div>}
      </div>
      <div className="sb-search">
        <div className="sb-search-input">
          <I.Search size={12}/>
          {!collapsed && <>
            <span>Search…</span>
            <span className="sb-search-kbd">⌘K</span>
          </>}
        </div>
      </div>
      <nav className="sb-nav">
        <div className="sb-section">
          <Item id="dashboard" icon="Dashboard" label="Dashboard"/>
          <Item id="orders" icon="Receipt" label="Live Orders" badge="12" badgeKind="live"/>
          <Item id="cart" icon="Cart" label="Cart / Register"/>
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Catalog</div>
          <Item id="products" icon="Box" label="Products" badge="248"/>
          <Item id="categories" icon="Layers" label="Categories" badge="14"/>
          <Item id="modifiers" icon="Sliders" label="Modifiers" badge="36"/>
          <Item id="mod-groups" icon="Layers" label="Modifier Groups" badge="6"/>
          <Item id="deals" icon="Sparkles" label="Meal Deals" badge="8"/>
          <Item id="deal-groups" icon="Layers" label="Deal Groups" badge="3"/>
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Operations</div>
          <Item id="locations" icon="Pin" label="Locations" badge="14"/>
          <Item id="terminals" icon="Monitor" label="Terminals" badge="47"/>
          <Item id="staff" icon="Users" label="Staff" badge="86"/>
          <Item id="printers" icon="Printer" label="Printers"/>
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Insights</div>
          <Item id="reports" icon="Chart" label="Reports"/>
          <Item id="customers" icon="User" label="Customers" badge="12.4k"/>
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Account</div>
          <Item id="settings" icon="Settings" label="Settings"/>
          <Item id="auth" icon="Lock" label="Auth & Onboarding"/>
        </div>
      </nav>
      <div className="sb-foot">
        <div className="sb-avatar">MC</div>
        <div className="sb-user">
          <div className="sb-user-name">Maya Chen</div>
          <div className="sb-user-role">Admin · HQ</div>
        </div>
        <div className="sb-foot-actions">
          <div className="sb-icon-btn" title="Notifications"><I.Bell size={13}/></div>
          <div className="sb-icon-btn" title="Help"><I.Help size={13}/></div>
        </div>
      </div>
    </aside>
  );
};

// Top bar
const Topbar = ({ crumbs, onToggleSidebar, right }) => (
  <div className="topbar">
    <button className="btn btn-ghost btn-icon" onClick={onToggleSidebar} title="Toggle sidebar">
      <I.Sidebar size={14}/>
    </button>
    <div className="topbar-crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <I.Chevron/>}
          <span className={i === crumbs.length - 1 ? 'crumb-current' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="topbar-spacer"/>
    <div className="topbar-status">
      <span className="dot"/>
      <span>All systems · synced</span>
    </div>
    {right}
    <button className="btn btn-ghost btn-icon" title="Notifications"><I.Bell size={14}/></button>
    <button className="btn btn-sm">
      <I.Plus size={12}/> Quick action
      <span className="kbd">N</span>
    </button>
  </div>
);

// Sparkline
const Spark = ({ data, color = 'var(--accent)', w = 60, h = 22 }) => {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity="0.08"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const Cbx = ({ checked, onClick }) => (
  <span className={'cbx' + (checked ? ' checked' : '')} onClick={onClick}/>
);

const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{label}</span>
    {children}
  </label>
);

export { Sidebar, Topbar, Spark, Cbx, Field };

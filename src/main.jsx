import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

// Import all components and data
import { I, Ico } from './icons';
import { DATA } from './data';
import { DEAL_GROUPS, DEAL_PRODUCTS, PRODUCT_GROUPS, MOD_GROUP_ITEMS, CUSTOMERS } from './data-extended';
import { Sidebar, Topbar, Spark, Cbx } from './shell';
import { Dashboard, OrderStatus, RevenueChart, DonutChart } from './page-dashboard';
import { Products, Field } from './page-products';
import { Locations } from './page-locations';
import { Orders, Row } from './page-orders';
import { Reports, Auth } from './page-reports-auth';
import { EntryFlow } from './page-entry-flow';
import { POSRegister } from './page-pos-register';
import { CustomersPage, SettingsPage, GroupsPage } from './page-misc';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
} from './tweaks-panel';

// ── Make globals available for cross-component access ──
// This preserves the original architecture where components
// reference each other via window/global scope.
window.I = I;
window.Ico = Ico;
window.DATA = DATA;
window.DEAL_GROUPS = DEAL_GROUPS;
window.DEAL_PRODUCTS = DEAL_PRODUCTS;
window.PRODUCT_GROUPS = PRODUCT_GROUPS;
window.MOD_GROUP_ITEMS = MOD_GROUP_ITEMS;
window.CUSTOMERS = CUSTOMERS;
window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.Spark = Spark;
window.Cbx = Cbx;
window.Dashboard = Dashboard;
window.OrderStatus = OrderStatus;
window.RevenueChart = RevenueChart;
window.DonutChart = DonutChart;
window.Products = Products;
window.Field = Field;
window.Locations = Locations;
window.Orders = Orders;
window.Row = Row;
window.Reports = Reports;
window.Auth = Auth;
window.EntryFlow = EntryFlow;
window.POSRegister = POSRegister;
window.CustomersPage = CustomersPage;
window.SettingsPage = SettingsPage;
window.GroupsPage = GroupsPage;
window.useTweaks = useTweaks;
window.TweaksPanel = TweaksPanel;
window.TweakSection = TweakSection;
window.TweakRow = TweakRow;
window.TweakSlider = TweakSlider;
window.TweakToggle = TweakToggle;
window.TweakRadio = TweakRadio;
window.TweakSelect = TweakSelect;
window.TweakText = TweakText;
window.TweakNumber = TweakNumber;
window.TweakColor = TweakColor;
window.TweakButton = TweakButton;

// ── Routes ──
const ROUTES = {
  dashboard: { crumbs: ['Workspace', 'Dashboard'], label: 'Dashboard' },
  orders: { crumbs: ['Operations', 'Live Orders'], label: 'Live Orders' },
  products: { crumbs: ['Catalog', 'Products'], label: 'Products' },
  categories: { crumbs: ['Catalog', 'Categories'], label: 'Categories' },
  modifiers: { crumbs: ['Catalog', 'Modifiers'], label: 'Modifiers' },
  'mod-groups': { crumbs: ['Catalog', 'Modifier Groups'], label: 'Modifier Groups' },
  deals: { crumbs: ['Catalog', 'Meal Deals'], label: 'Meal Deals' },
  'deal-groups': { crumbs: ['Catalog', 'Meal Deal Groups'], label: 'Meal Deal Groups' },
  locations: { crumbs: ['Operations', 'Locations'], label: 'Locations' },
  terminals: { crumbs: ['Operations', 'Terminals'], label: 'Terminals' },
  staff: { crumbs: ['Operations', 'Staff'], label: 'Staff' },
  printers: { crumbs: ['Operations', 'Printers'], label: 'Printers' },
  reports: { crumbs: ['Insights', 'Reports'], label: 'Reports' },
  customers: { crumbs: ['Insights', 'Customers'], label: 'Customers' },
  settings: { crumbs: ['Account', 'Settings'], label: 'Settings' },
  auth: { crumbs: ['Account', 'Auth & Onboarding'], label: 'Auth' },
};

// ── Tweak Defaults ──
const TWEAK_DEFAULTS = {
  "sidebarCollapsed": false
};

// ── App Component ──
const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [stage, setStage] = React.useState('auth'); // 'auth' | 'entry' | 'admin' | 'pos'
  const [entryStep, setEntryStep] = React.useState('location');
  const [ctx, setCtx] = React.useState({ merchant: null, location: null, terminal: null, channel: null, posType: null, staff: null });
  const [route, setRoute] = React.useState('dashboard');
  const collapsed = t.sidebarCollapsed;

  const advance = (next) => {
    if (next === 'done') { setStage('admin'); setRoute('dashboard'); }
    else setEntryStep(next);
  };
  const back = () => {
    const order = ['location', 'terminal', 'channel', 'pos-type', 'pin'];
    const i = order.indexOf(entryStep);
    if (i > 0) setEntryStep(order[i - 1]);
  };
  const handleLoginSuccess = (merchant) => {
    setCtx(prev => ({ ...prev, merchant }));
    setStage('entry');
    setEntryStep('location');
  };

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === '[' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTweak('sidebarCollapsed', !collapsed);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [collapsed, setTweak]);

  if (stage === 'auth') {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }
  if (stage === 'entry') {
    return <EntryFlow step={entryStep} ctx={ctx} setCtx={setCtx} onNext={advance} onBack={back}
      onExit={() => { setCtx({ location: DATA.locations[0], terminal: DATA.terminals[0], channel: { id: 'dine-in', name: 'Dine-in' }, posType: { id: 'restaurant', name: 'Restaurant POS' }, staff: { name: 'Maya Chen', initials: 'MC' } }); setStage('admin'); }} />;
  }
  if (stage === 'pos') {
    return <POSRegister ctx={ctx} onExit={() => setStage('admin')} />;
  }

  const r = ROUTES[route] || ROUTES.dashboard;

  // Floating POS launcher
  const PosLauncher = () => (
    <button onClick={() => setStage('pos')} title="Open POS Register"
      style={{
        position: 'fixed', bottom: 20, right: 20, height: 48, paddingInline: 18, zIndex: 50,
        borderRadius: 24, border: 'none', background: 'var(--ink)', color: '#fff',
        fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
      }}>
      <I.Cart size={15} /> Open Register
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', opacity: 0.7, padding: '2px 5px', background: 'rgba(255,255,255,0.15)', borderRadius: 3 }}>F2</span>
    </button>
  );

  // Auth is full-bleed (no sidebar)
  if (route === 'auth') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => setRoute('dashboard')}>← Back to app</button>
          <div className="topbar-spacer" />
          <span className="chip">Authentication & Onboarding flow</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Auth onLoginSuccess={handleLoginSuccess} />
        </div>
        <TweaksPanel title="Tweaks">
          <TweakSection title="Layout">
            <TweakToggle label="Sidebar collapsed" value={t.sidebarCollapsed} onChange={(v) => setTweak('sidebarCollapsed', v)} />
          </TweakSection>
        </TweaksPanel>
      </div>
    );
  }

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <Sidebar route={route} setRoute={setRoute} collapsed={collapsed} />
      <div className="main">
        <Topbar
          crumbs={r.crumbs}
          onToggleSidebar={() => setTweak('sidebarCollapsed', !collapsed)}
        />
        <div className="workspace">
          {route === 'dashboard' && <Dashboard ctx={ctx} />}
          {(route === 'products' || route === 'categories' || route === 'modifiers' || route === 'deals') && <Products />}
          {route === 'mod-groups' && <GroupsPage kind="modifiers" />}
          {route === 'deal-groups' && <GroupsPage kind="deals" />}
          {(route === 'locations' || route === 'terminals' || route === 'staff' || route === 'printers') && <Locations selected={{ location: ctx.location, terminal: ctx.terminal }} />}
          {route === 'orders' && <Orders />}
          {route === 'reports' && <Reports />}
          {route === 'customers' && <CustomersPage />}
          {route === 'settings' && <SettingsPage />}
        </div>
        <PosLauncher />
      </div>
      <TweaksPanel title="Tweaks">
        <TweakSection title="Layout">
          <TweakToggle label="Sidebar collapsed" value={t.sidebarCollapsed} onChange={(v) => setTweak('sidebarCollapsed', v)} />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>⌘ + [ to toggle</div>
        </TweakSection>
        <TweakSection title="Quick navigation">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {Object.entries(ROUTES).map(([k, v]) => (
              <button key={k} className="btn btn-sm" style={route === k ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}}
                onClick={() => setRoute(k)}>{v.label}</button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

const PlaceholderPage = ({ title, sub }) => (
  <div>
    <div className="page-header">
      <div style={{ flex: 1 }}>
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{sub}</p>
      </div>
    </div>
    <div className="empty">
      <div style={{ fontSize: 13, marginBottom: 4 }}>This module is wired into the IA but not yet designed.</div>
      <div style={{ fontSize: 11 }}>Ask me to expand it next.</div>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

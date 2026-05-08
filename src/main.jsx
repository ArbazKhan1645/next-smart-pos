import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

// ── Data Layers ──
import { DATA } from './data';
import { DEAL_GROUPS, DEAL_PRODUCTS, PRODUCT_GROUPS, MOD_GROUP_ITEMS, CUSTOMERS } from './data-extended';

// ── Common Modules ──
import { I, Ico } from './modules/common/icons';
import { Sidebar, Topbar, Spark, Cbx, Field } from './modules/common/components/Shell';
import {
  useTweaks, TweaksProvider, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
} from './modules/common/components/TweaksPanel';

// ── Feature Modules ──
import AuthScreen from './modules/auth/screens/AuthScreen';
import EntryFlowScreen from './modules/auth/screens/EntryFlowScreen';
import DashboardScreen from './modules/dashboard/screens/DashboardScreen';
import ProductsScreen from './modules/products/screens/ProductsScreen';
import GroupsScreen from './modules/catalog/screens/GroupsScreen';
import LocationsScreen from './modules/locations/screens/LocationsScreen';
import OrdersScreen from './modules/orders/screens/OrdersScreen';
import POSScreen from './modules/pos/screens/POSScreen';
import CustomersScreen from './modules/customers/screens/CustomersScreen';
import SettingsScreen from './modules/settings/screens/SettingsScreen';
import ReportsScreen from './modules/reports/screens/ReportsScreen';

// ── Architecture Bridge ──
// Preserving global access for legacy component compatibility during migration
window.I = I;
window.Ico = Ico;
window.DATA = DATA;
window.DEAL_GROUPS = DEAL_GROUPS;
window.DEAL_PRODUCTS = DEAL_PRODUCTS;
window.PRODUCT_GROUPS = PRODUCT_GROUPS;
window.MOD_GROUP_ITEMS = MOD_GROUP_ITEMS;
window.CUSTOMERS = CUSTOMERS;
window.Spark = Spark;
window.Cbx = Cbx;
window.Field = Field;
window.useTweaks = useTweaks;

// ── Routes Configuration ──
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
};

// ── Tweak Defaults ──
const TWEAK_DEFAULTS = {
  "sidebarCollapsed": false
};

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
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (stage === 'entry') {
    return (
      <EntryFlowScreen
        step={entryStep}
        ctx={ctx}
        setCtx={setCtx}
        onNext={advance}
        onBack={back}
        onExit={() => {
          setCtx({
            location: DATA.locations[0],
            terminal: DATA.terminals[0],
            channel: { id: 'dine-in', name: 'Dine-in' },
            posType: { id: 'restaurant', name: 'Restaurant POS' },
            staff: { name: 'Maya Chen', initials: 'MC' }
          });
          setStage('admin');
        }}
      />
    );
  }

  if (stage === 'pos') {
    return <POSScreen ctx={ctx} onExit={() => setStage('admin')} />;
  }

  const r = ROUTES[route] || ROUTES.dashboard;

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

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <Sidebar route={route} setRoute={setRoute} collapsed={collapsed} />
      <div className="main">
        <Topbar
          crumbs={r.crumbs}
          onToggleSidebar={() => setTweak('sidebarCollapsed', !collapsed)}
        />
        <div className="workspace">
          {route === 'dashboard' && <DashboardScreen />}
          {(route === 'products' || route === 'categories' || route === 'modifiers' || route === 'deals') && <ProductsScreen />}
          {route === 'mod-groups' && <GroupsScreen kind="modifiers" />}
          {route === 'deal-groups' && <GroupsScreen kind="deals" />}
          {(route === 'locations' || route === 'terminals' || route === 'staff' || route === 'printers') && <LocationsScreen />}
          {route === 'orders' && <OrdersScreen />}
          {route === 'reports' && <ReportsScreen />}
          {route === 'customers' && <CustomersScreen />}
          {route === 'settings' && <SettingsScreen />}
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <TweaksProvider>
    <App />
  </TweaksProvider>
);

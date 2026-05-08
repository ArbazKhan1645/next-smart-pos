// Entry flow screens: Merchant Login → OTP → Location → Terminal → Channel → POS Type → PIN
const EntryFlow = ({ step, ctx, setCtx, onNext, onBack, onExit }) => {
  const [locationOptions, setLocationOptions] = React.useState([]);

  React.useEffect(() => {
    if (ctx.merchant) {
      const filtered = DATA.locations.filter(l => l.merchant_id === ctx.merchant.id);
      setLocationOptions(filtered);
    }
  }, [ctx.merchant]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div className="topbar" style={{ background: 'var(--surface)' }}>
        <div className="sb-logo" style={{ width: 24, height: 24 }}>S</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>Smart POS</div>
        {ctx.merchant && <span className="chip" style={{ marginLeft: 8 }}>{ctx.merchant.name}</span>}
        <div className="topbar-spacer" />
        <FlowSteps step={step} />
        <div className="topbar-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={onExit} title="Skip to dashboard">Skip flow →</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '40px 20px' }}>
        {step === 'merchant-login' && <MerchantLogin ctx={ctx} setCtx={setCtx} onNext={onNext} />}
        {step === 'otp' && <OTPScreen ctx={ctx} setCtx={setCtx} onNext={onNext} onBack={onBack} />}
        {step === 'location' && <PickLocation ctx={ctx} setCtx={setCtx} onNext={onNext} onBack={onBack} locationOptions={locationOptions} onAddLocation={(loc) => setLocationOptions(prev => [...prev, loc])} />}
        {step === 'terminal' && <PickTerminal ctx={ctx} setCtx={setCtx} onNext={onNext} onBack={onBack} />}
        {step === 'channel' && <PickChannel ctx={ctx} setCtx={setCtx} onNext={onNext} onBack={onBack} />}
        {step === 'pos-type' && <PickPOSType ctx={ctx} setCtx={setCtx} onNext={onNext} onBack={onBack} />}
        {step === 'pin' && <PickPIN ctx={ctx} setCtx={setCtx} onNext={onNext} onBack={onBack} />}
      </div>
    </div>
  );
};

const FlowSteps = ({ step }) => {
  const steps = [
    { id: 'merchant-login', label: 'Auth' },
    { id: 'location', label: 'Location' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'channel', label: 'Channel' },
    { id: 'pos-type', label: 'POS Type' },
    { id: 'pin', label: 'Sign in' },
  ];
  const idx = steps.findIndex(s => s.id === step || (step === 'otp' && s.id === 'merchant-login'));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 8px', borderRadius: 12,
            background: i === idx ? 'var(--ink)' : i < idx ? 'var(--accent-soft)' : 'transparent',
            color: i === idx ? '#fff' : i < idx ? 'var(--accent-ink)' : 'var(--muted)',
            fontSize: 11, fontWeight: 500
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{i < idx ? '✓' : (i + 1)}</span>
            {s.label}
          </div>
          {i < steps.length - 1 && <span style={{ color: 'var(--muted-2)' }}>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

const FlowHeader = ({ title, sub, onBack }) => (
  <div style={{ maxWidth: 1100, margin: '0 auto 24px', display: 'flex', alignItems: 'flex-end' }}>
    <div style={{ flex: 1 }}>
      {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>}
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{title}</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{sub}</p>
    </div>
  </div>
);

const MerchantLogin = ({ ctx, setCtx, onNext }) => {
  const [sel, setSel] = React.useState(ctx.merchant);
  return (
    <>
      <FlowHeader
        title="Merchant Authentication"
        sub="Identify yourself as a merchant partner to access your locations."
      />
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Select Merchant Account</label>
            <div style={{ display: 'grid', gap: 10 }}>
              {DATA.merchants.map(m => (
                <div key={m.id} className="card" onClick={() => setSel(m)}
                  style={{
                    padding: 16, cursor: 'pointer',
                    borderColor: sel?.id === m.id ? 'var(--ink)' : 'var(--border)',
                    boxShadow: sel?.id === m.id ? '0 0 0 1px var(--ink)' : 'none',
                    background: sel?.id === m.id ? 'var(--bg-2)' : 'var(--surface)',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)', fontWeight: 600 }}>{m.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.email} · {m.plan}</div>
                  </div>
                  {sel?.id === m.id && <I.Check size={16} />}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', height: 44 }} disabled={!sel}
            onClick={() => { setCtx({ ...ctx, merchant: sel }); onNext('otp'); }}>
            Login to Merchant Dashboard →
          </button>
        </div>
      </div>
    </>
  );
};

const OTPScreen = ({ ctx, setCtx, onNext, onBack }) => {
  const [otp, setOtp] = React.useState('');
  const [error, setError] = React.useState(false);
  const correctOtp = '6666';

  const submit = () => {
    if (otp === correctOtp) {
      onNext('location');
    } else {
      setError(true);
      setTimeout(() => { setError(false); setOtp(''); }, 1000);
    }
  };

  return (
    <>
      <FlowHeader
        onBack={onBack}
        title="Verify your identity"
        sub={`We've sent a 4-digit code to ${ctx.merchant.email}. Enter it below to continue.`}
      />
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <I.Shield size={32} style={{ color: 'var(--accent-ink)' }} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Enter the verification code</div>
          <input
            className="input"
            type="text"
            maxLength={4}
            value={otp}
            onChange={e => setOtp(e.target.value)}
            style={{ height: 60, fontSize: 32, textAlign: 'center', letterSpacing: 16, fontWeight: 700, marginBottom: 12, borderColor: error ? 'var(--danger)' : 'var(--border)' }}
            placeholder="0000"
          />
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>Invalid OTP. Hint: 6666</div>}
          <div style={{ marginBottom: 24, fontSize: 12, color: 'var(--muted)' }}>Didn't receive code? <a href="#" style={{ color: 'var(--ink)' }}>Resend code</a></div>
          <button className="btn btn-primary" style={{ width: '100%', height: 44 }} disabled={otp.length < 4} onClick={submit}>
            Verify and Continue →
          </button>
        </div>
      </div>
    </>
  );
};

const PickLocation = ({ ctx, setCtx, onNext, onBack, locationOptions, onAddLocation }) => {
  const [sel, setSel] = React.useState(ctx.location);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [newLocation, setNewLocation] = React.useState({
    name: '', email: '', phone: '', website: '', logo: '', address: '', country: 'United States', type: 'Restaurant'
  });

  const createLocation = () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) return;
    const slug = newLocation.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 3) || 'NEW';
    const code = `${slug}-${10 + Math.floor(Math.random() * 90)}`;
    const id = `L-${100 + Math.floor(Math.random() * 900)}`;
    const city = newLocation.address.split(',')[1]?.trim() || newLocation.name;
    const location = {
      id,
      merchant_id: ctx.merchant.id,
      name: newLocation.name,
      code,
      city,
      status: 'open',
      terminals: 1,
      staff: 3,
      sales: 0,
      channels: ['Dine-in', 'Takeaway'],
      type: newLocation.type,
      email: newLocation.email,
      phone: newLocation.phone,
      website: newLocation.website,
      logo: newLocation.logo,
      address: newLocation.address,
      country: newLocation.country,
    };
    onAddLocation(location);
    setSel(location);
    setDrawerOpen(false);
    setNewLocation({ name: '', email: '', phone: '', website: '', logo: '', address: '', country: 'United States', type: 'Restaurant' });
  };

  return (
    <>
      <FlowHeader
        onBack={onBack}
        title="Select your location"
        sub={`${ctx.merchant.name} · You have access to ${locationOptions.length} locations. Pick where you'll be working today.`}
      />
      <div style={{ maxWidth: 1100, margin: '0 auto 18px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>Add new location</button>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {locationOptions.map(l => {
          const active = sel?.id === l.id;
          const disabled = l.status === 'maintenance' || l.status === 'closed';
          return (
            <div key={l.id} className="card" onClick={() => !disabled && setSel(l)}
              style={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                borderColor: active ? 'var(--ink)' : 'var(--border)',
                boxShadow: active ? '0 0 0 1px var(--ink)' : 'none',
                transition: 'all 120ms'
              }}>
              <div style={{ height: 88, background: 'linear-gradient(135deg, oklch(0.95 0.02 145), oklch(0.92 0.04 145))', position: 'relative', borderRadius: '6px 6px 0 0' }}>
                <div style={{ position: 'absolute', top: 8, left: 10, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{l.code}</div>
                <div style={{ position: 'absolute', top: 8, right: 10 }}>
                  {l.status === 'open' && <span className="chip chip-accent" style={{ fontSize: 10 }}><span className="dot" />Open</span>}
                  {l.status === 'closed' && <span className="chip" style={{ fontSize: 10 }}>Closed</span>}
                  {l.status === 'syncing' && <span className="chip chip-warn" style={{ fontSize: 10 }}>Syncing</span>}
                  {l.status === 'maintenance' && <span className="chip chip-danger" style={{ fontSize: 10 }}>Maintenance</span>}
                </div>
                <I.Building size={36} style={{ position: 'absolute', bottom: 10, left: 10, color: 'oklch(0.55 0.10 145)', opacity: 0.4 }} />
                {active && <div style={{ position: 'absolute', bottom: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', display: 'grid', placeItems: 'center' }}>
                  <I.Check size={13} style={{ color: '#fff' }} />
                </div>}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{l.city} · {l.type}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                  <Stat k="Terminals" v={l.terminals} />
                  <Stat k="Staff" v={l.staff} />
                  <Stat k="Channels" v={l.channels.length} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ maxWidth: 1100, margin: '24px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!sel} style={{ height: 36, paddingInline: 16, opacity: sel ? 1 : 0.4 }}
          onClick={() => { setCtx({ ...ctx, location: sel }); onNext('terminal'); }}>
          Continue with {sel ? sel.code : '—'} →
        </button>
      </div>

      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.32)', zIndex: 90, display: 'flex', justifyContent: 'flex-end', padding: 20 }}>
          <div style={{ width: 480, maxWidth: '100%', height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', boxShadow: '0 0 0 1px rgba(15,15,15,0.08)', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Add new location</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Fill in the location details and create a new site.</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDrawerOpen(false)}><I.X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I.Building size={16} />
                  Basic Information
                </div>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Location name *</label>
                    <input className="input" value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                      placeholder="e.g. West Village" style={{ height: 40, fontSize: 14 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Location type</label>
                      <select className="input" value={newLocation.type} onChange={e => setNewLocation({ ...newLocation, type: e.target.value })}
                        style={{ height: 40, fontSize: 14 }}>
                        <option>Restaurant</option>
                        <option>Cafe</option>
                        <option>Retail</option>
                        <option>QSR</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Country</label>
                      <select className="input" value={newLocation.country} onChange={e => setNewLocation({ ...newLocation, country: e.target.value })}
                        style={{ height: 40, fontSize: 14 }}>
                        <option>United States</option>
                        <option>Canada</option>
                        <option>United Kingdom</option>
                        <option>Australia</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I.Mail size={16} />
                  Contact Information
                </div>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Location email</label>
                    <input className="input" type="email" value={newLocation.email} onChange={e => setNewLocation({ ...newLocation, email: e.target.value })}
                      placeholder="support@northwind.co" style={{ height: 40, fontSize: 14 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Phone</label>
                      <input className="input" type="tel" value={newLocation.phone} onChange={e => setNewLocation({ ...newLocation, phone: e.target.value })}
                        placeholder="+1 212-555-0184" style={{ height: 40, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Website</label>
                      <input className="input" type="url" value={newLocation.website} onChange={e => setNewLocation({ ...newLocation, website: e.target.value })}
                        placeholder="https://northwind.co" style={{ height: 40, fontSize: 14 }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I.Pin size={16} />
                  Address & Branding
                </div>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Address *</label>
                    <input className="input" value={newLocation.address} onChange={e => setNewLocation({ ...newLocation, address: e.target.value })}
                      placeholder="123 Spring St, New York, NY 10012" style={{ height: 40, fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Logo image URL</label>
                    <input className="input" type="url" value={newLocation.logo} onChange={e => setNewLocation({ ...newLocation, logo: e.target.value })}
                      placeholder="https://example.com/logo.png" style={{ height: 40, fontSize: 14 }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 28px 28px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, background: 'var(--surface)' }}>
              <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)} style={{ height: 44, paddingInline: 20 }}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 14, fontWeight: 600 }}
                onClick={createLocation} disabled={!newLocation.name.trim() || !newLocation.address.trim()}>
                Create location
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PickTerminal = ({ ctx, setCtx, onNext, onBack }) => {
  const [sel, setSel] = React.useState(ctx.terminal);
  const list = DATA.terminals.filter(t => t.location_id === ctx.location.id);
  return (
    <>
      <FlowHeader
        onBack={onBack}
        title={`Pick a terminal · ${ctx.location.name}`}
        sub={`${list.length} terminals registered at this location. Select the device you're using.`}
      />
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {list.map(t => {
          const active = sel?.id === t.id;
          const offline = t.status === 'offline';
          return (
            <div key={t.id} className="card" onClick={() => !offline && setSel(t)}
              style={{
                padding: 14, cursor: offline ? 'not-allowed' : 'pointer', opacity: offline ? 0.5 : 1,
                borderColor: active ? 'var(--ink)' : 'var(--border)',
                boxShadow: active ? '0 0 0 1px var(--ink)' : 'none', transition: 'all 120ms'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, background: 'var(--surface-2)', borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                  <I.Monitor size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.id} · {t.device}</div>
                </div>
                {active
                  ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', display: 'grid', placeItems: 'center' }}><I.Check size={13} style={{ color: '#fff' }} /></div>
                  : t.status === 'online' ? <span className="chip chip-accent"><I.Wifi size={10} />Online</span>
                    : t.status === 'syncing' ? <span className="chip chip-warn"><I.Refresh size={10} />Sync</span>
                      : <span className="chip chip-danger"><I.WifiOff size={10} />Offline</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
                <Stat k="IP" v={t.ip} mono />
                <Stat k="Battery" v={t.battery == null ? '—' : t.battery + '%'} />
                <Stat k="Printer" v={t.printer === '—' ? '—' : 'Linked'} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ maxWidth: 980, margin: '24px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!sel} style={{ height: 36, paddingInline: 16, opacity: sel ? 1 : 0.4 }}
          onClick={() => { setCtx({ ...ctx, terminal: sel }); onNext('channel'); }}>
          Continue with {sel ? sel.id : '—'} →
        </button>
      </div>
    </>
  );
};

const PickChannel = ({ ctx, setCtx, onNext, onBack }) => {
  const [sel, setSel] = React.useState(ctx.channel);
  const channels = [
    { id: 'dine-in', name: 'Dine-in', icon: 'Building', desc: 'Table service · Service charge enabled', color: 'oklch(0.62 0.17 145)' },
    { id: 'takeaway', name: 'Takeaway', icon: 'Bag', desc: 'Counter pickup · Customer name on ticket', color: 'oklch(0.65 0.14 200)' },
    { id: 'delivery', name: 'Delivery', icon: 'Truck', desc: 'Address required · Delivery fee applied', color: 'oklch(0.70 0.15 70)' },
    { id: 'qr', name: 'QR Order', icon: 'Layers', desc: 'Customer self-orders at table', color: 'oklch(0.55 0.18 290)' },
    { id: 'drive-thru', name: 'Drive-thru', icon: 'Truck', desc: 'Express channel · 1-tap routing', color: 'oklch(0.60 0.18 25)' },
    { id: 'in-store', name: 'In-store', icon: 'Bag', desc: 'Walk-in retail purchase', color: 'oklch(0.55 0.10 50)' },
  ];
  return (
    <>
      <FlowHeader
        onBack={onBack}
        title="Choose a sales channel"
        sub={`${ctx.location.name} · ${ctx.terminal.name} · pick how you'll be taking orders this shift.`}
      />
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {channels.map(c => {
          const Icon = I[c.icon];
          const active = sel?.id === c.id;
          return (
            <div key={c.id} className="card" onClick={() => setSel(c)}
              style={{
                padding: 16, cursor: 'pointer',
                borderColor: active ? 'var(--ink)' : 'var(--border)',
                boxShadow: active ? '0 0 0 1px var(--ink)' : 'none', transition: 'all 120ms'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: c.color, opacity: 0.15, position: 'relative' }}>
                  <Icon size={20} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: c.color, opacity: 4 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.desc}</div>
                </div>
                {active && <I.Check size={14} />}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ maxWidth: 980, margin: '24px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!sel} style={{ height: 36, paddingInline: 16, opacity: sel ? 1 : 0.4 }}
          onClick={() => { setCtx({ ...ctx, channel: sel }); onNext('pos-type'); }}>
          Continue →
        </button>
      </div>
    </>
  );
};

const PickPOSType = ({ ctx, setCtx, onNext, onBack }) => {
  const [sel, setSel] = React.useState(ctx.posType);
  const types = [
    { id: 'restaurant', name: 'Restaurant POS', icon: 'Flame', desc: 'Tables, courses, modifiers, kitchen routing.', features: ['Table layout', 'KDS routing', 'Course timing', 'Modifiers'] },
    { id: 'retail', name: 'Retail POS', icon: 'Shirt', desc: 'SKU lookup, barcode scan, inventory-first.', features: ['Barcode scan', 'Variants', 'Stock levels', 'Returns'] },
  ];
  return (
    <>
      <FlowHeader
        onBack={onBack}
        title="Pick your POS mode"
        sub="Different verticals get different layouts and behaviour. You can switch later from the register."
      />
      <div style={{ maxWidth: 740, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {types.map(t => {
          const Icon = I[t.icon];
          const active = sel?.id === t.id;
          return (
            <div key={t.id} className="card" onClick={() => setSel(t)}
              style={{
                padding: 24, cursor: 'pointer',
                borderColor: active ? 'var(--ink)' : 'var(--border)',
                boxShadow: active ? '0 0 0 1px var(--ink)' : 'none', transition: 'all 120ms'
              }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <Icon size={22} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>{t.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {t.features.map(f => <span key={f} className="chip" style={{ fontSize: 10 }}>{f}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ maxWidth: 740, margin: '24px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!sel} style={{ height: 36, paddingInline: 16, opacity: sel ? 1 : 0.4 }}
          onClick={() => { setCtx({ ...ctx, posType: sel }); onNext('pin'); }}>
          Continue →
        </button>
      </div>
    </>
  );
};

const PickPIN = ({ ctx, setCtx, onNext, onBack }) => {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);
  const correctPin = '1234';
  const press = (k) => {
    setError(false);
    if (k === '⌫') setPin(pin.slice(0, -1));
    else if (pin.length < 4) {
      const next = pin + k;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (next === correctPin) {
            setCtx({ ...ctx, staff: { name: 'Maya Chen', role: 'Admin', initials: 'MC' } });
            onNext('done');
          } else {
            setError(true);
            setTimeout(() => setPin(''), 600);
          }
        }, 150);
      }
    }
  };
  return (
    <>
      <FlowHeader
        onBack={onBack}
        title="Sign in with your PIN"
        sub={`${ctx.location.code} · ${ctx.terminal.id} · ${ctx.channel.name} · ${ctx.posType.name}`}
      />
      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <div className="sb-avatar" style={{ width: 56, height: 56, fontSize: 18, margin: '0 auto 12px' }}>MC</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Maya Chen</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Admin · {ctx.merchant.name}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '24px 0' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '1.5px solid ' + (error ? 'var(--danger)' : (pin.length > i ? 'var(--ink)' : 'var(--border-strong)')),
                background: pin.length > i ? (error ? 'var(--danger)' : 'var(--ink)') : 'transparent',
                transition: 'all 120ms'
              }} />
            ))}
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: -10, marginBottom: 8 }}>Wrong PIN — try again</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
              k === '' ? <div key={i} /> :
                <button key={i} onClick={() => press(k)}
                  style={{
                    height: 52, fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8,
                    cursor: 'pointer'
                  }}>{k}</button>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)' }}>Hint: 1234</div>
        </div>
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Not Maya? <a href="#" style={{ color: 'var(--ink)', fontWeight: 500 }}>Switch user</a>
        </div>
      </div>
    </>
  );
};

const Stat = ({ k, v, mono }) => (
  <div>
    <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
    <div style={{ fontSize: 12, fontWeight: 500, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{v}</div>
  </div>
);

window.EntryFlow = EntryFlow;

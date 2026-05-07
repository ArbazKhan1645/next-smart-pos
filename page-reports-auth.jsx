// Reports + Auth/Onboarding
const Reports = () => {
  const [tab, setTab] = React.useState('sales');
  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Enterprise analytics across sales, products, staff, taxes and inventory.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn"><I.Calendar size={12}/> Apr 24 – May 7</button>
          <button className="btn"><I.Filter size={12}/> Filters</button>
          <button className="btn"><I.Download size={12}/> Export CSV</button>
          <button className="btn btn-primary"><I.Plus size={12}/> Schedule report</button>
        </div>
      </div>
      <div className="page-tabs">
        {['sales','products','staff','tax','inventory','customers'].map(id => (
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
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}><I.Download size={11}/></button>
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
                      <Spark data={[10,14,12,18,16,20,22,21,24,26,23,28].map(v => v + i)} w={80} h={20}/>
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
            <div style={{ padding: 14, height: 220 }}><RevenueChart/></div>
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
                  <span style={{ width: 8, height: 8, background: r[2], borderRadius: 2 }}/>
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

// Auth & Onboarding
const Auth = () => {
  const [step, setStep] = React.useState('login');
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 480px' }}>
      <div style={{ background: 'linear-gradient(135deg, oklch(0.97 0.01 145), oklch(0.93 0.04 145))', padding: 40, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'auto' }}>
          <div className="sb-logo" style={{ width: 28, height: 28 }}>S</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Smart POS</div>
        </div>
        <div style={{ maxWidth: 400 }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 12 }}>
            The operating system for modern hospitality.
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Run your menu, kitchens, terminals, staff and reporting from a single workspace. Built for chains with 1 location or 1,000.
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip">SOC 2 Type II</span>
            <span className="chip">99.99% uptime</span>
            <span className="chip">PCI DSS</span>
            <span className="chip">GDPR</span>
          </div>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 16 }}>
          <span>Trusted by 12,400+ merchants</span>
          <span>·</span>
          <span>14 countries</span>
        </div>
      </div>
      <div style={{ background: 'var(--surface)', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {step === 'login' && <LoginPanel onForgot={() => setStep('forgot')} onSignup={() => setStep('signup')} onOTP={() => setStep('otp')}/>}
        {step === 'signup' && <SignupPanel onBack={() => setStep('login')} onNext={() => setStep('onboard')}/>}
        {step === 'forgot' && <ForgotPanel onBack={() => setStep('login')}/>}
        {step === 'otp' && <OTPPanel onBack={() => setStep('login')} onDone={() => setStep('onboard')}/>}
        {step === 'onboard' && <OnboardPanel onBack={() => setStep('login')}/>}
      </div>
    </div>
  );
};

const inputCls = { width: '100%', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', outline: 'none' };

const LoginPanel = ({ onForgot, onSignup, onOTP }) => (
  <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Welcome back</div>
    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Sign in to your Smart POS workspace</div>
    <Field label="Email"><input style={inputCls} placeholder="you@company.com" defaultValue="maya@northwind.co"/></Field>
    <div style={{ height: 12 }}/>
    <Field label="Password">
      <div style={{ position: 'relative' }}>
        <input style={inputCls} type="password" placeholder="••••••••" defaultValue="••••••••••"/>
        <button className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4, top: 4 }}><I.Eye size={12}/></button>
      </div>
    </Field>
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <Cbx checked={true}/> Remember this device
      </label>
      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onForgot}>Forgot password</button>
    </div>
    <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, height: 36, justifyContent: 'center' }} onClick={onOTP}>Continue with email</button>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', color: 'var(--muted)', fontSize: 11 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>OR<div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <button className="btn">Google</button>
      <button className="btn">SSO · Okta</button>
    </div>
    <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
      New to Smart POS? <a href="#" onClick={(e)=>{e.preventDefault();onSignup();}} style={{ color: 'var(--ink)', fontWeight: 500 }}>Create account</a>
    </div>
  </div>
);
const SignupPanel = ({ onBack, onNext }) => (
  <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
    <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Create workspace</div>
    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Step 1 of 3 — your business</div>
    <Field label="Workspace name"><input style={inputCls} placeholder="e.g. Northwind Hospitality"/></Field><div style={{ height: 12 }}/>
    <Field label="Business type"><select style={inputCls}><option>Restaurant / QSR</option><option>Cafe / Coffee</option><option>Retail</option><option>Mixed</option></select></Field><div style={{ height: 12 }}/>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label="Country"><select style={inputCls}><option>United States</option></select></Field>
      <Field label="Currency"><select style={inputCls}><option>USD ($)</option></select></Field>
    </div><div style={{ height: 12 }}/>
    <Field label="Email"><input style={inputCls} placeholder="you@company.com"/></Field><div style={{ height: 12 }}/>
    <Field label="Password"><input style={inputCls} type="password" placeholder="••••••••"/></Field>
    <button className="btn btn-primary" style={{ width: '100%', marginTop: 18, height: 36, justifyContent: 'center' }} onClick={onNext}>Continue →</button>
  </div>
);
const ForgotPanel = ({ onBack }) => (
  <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
    <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Reset your password</div>
    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>We'll email you a reset link.</div>
    <Field label="Email"><input style={inputCls} placeholder="you@company.com"/></Field>
    <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, height: 36, justifyContent: 'center' }}>Send reset link</button>
  </div>
);
const OTPPanel = ({ onBack, onDone }) => {
  const [code, setCode] = React.useState(['1','7','3','','','']);
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Verify your device</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Enter the 6-digit code sent to <strong>maya@northwind.co</strong></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {code.map((c, i) => (
          <input key={i} value={c} maxLength={1}
            onChange={e => { const n = [...code]; n[i] = e.target.value; setCode(n); }}
            style={{ width: 44, height: 52, fontSize: 22, textAlign: 'center', fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', outline: 'none' }}/>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, height: 36, justifyContent: 'center' }} onClick={onDone}>Verify & continue</button>
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Didn't receive it? <a href="#" style={{ color: 'var(--ink)' }}>Resend</a> · 0:42</div>
    </div>
  );
};
const OnboardPanel = ({ onBack }) => {
  const [step, setStep] = React.useState(2);
  const steps = ['Workspace', 'First location', 'Import menu', 'Connect payments', 'Invite staff'];
  return (
    <div style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Set up your first location</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Step {step + 1} of {steps.length}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, height: 4, background: i <= step ? 'var(--accent)' : 'var(--surface-2)', borderRadius: 2 }}/>
        ))}
      </div>
      <Field label="Location name"><input style={inputCls} placeholder="Flagship — SoHo"/></Field><div style={{ height: 10 }}/>
      <Field label="Address"><input style={inputCls} placeholder="123 Spring St, New York, NY 10012"/></Field><div style={{ height: 10 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Tax registration"><input style={inputCls} placeholder="Optional"/></Field>
        <Field label="Timezone"><select style={inputCls}><option>America/New_York</option></select></Field>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Sales channels at this location</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Dine-in','Takeaway','Delivery','QR Order','Drive-thru'].map(c => (
            <span key={c} className={'chip' + (c === 'Dine-in' || c === 'Takeaway' ? ' chip-accent' : '')}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onBack}>Skip for now</button>
        <button className="btn btn-primary" style={{ flex: 1 }}>Continue →</button>
      </div>
    </div>
  );
};

window.Reports = Reports;
window.Auth = Auth;

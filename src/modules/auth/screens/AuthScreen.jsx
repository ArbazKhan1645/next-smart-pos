import React from 'react';

// Auth & Onboarding Screen
const AuthScreen = ({ onLoginSuccess }) => {
  const [step, setStep] = React.useState('login');
  const [merchant, setMerchant] = React.useState(null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 480px' }}>
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
        {step === 'login' && <LoginPanel onForgot={() => setStep('forgot')} onSignup={() => setStep('signup')} onOTP={(m) => { setMerchant(m); setStep('otp'); }} />}
        {step === 'signup' && <SignupPanel onBack={() => setStep('login')} onNext={() => setStep('onboard')} />}
        {step === 'forgot' && <ForgotPanel onBack={() => setStep('login')} />}
        {step === 'otp' && <OTPPanel merchant={merchant} onBack={() => setStep('login')} onDone={() => onLoginSuccess(merchant)} />}
      </div>
    </div>
  );
};

const inputCls = { width: '100%', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', outline: 'none' };

const LoginPanel = ({ onForgot, onSignup, onOTP }) => {
  const { DATA, I, Field } = window;
  const [email, setEmail] = React.useState('maya@northwind.co');
  const [password, setPassword] = React.useState('password123');
  const [error, setError] = React.useState('');

  const handleContinue = () => {
    const merchant = DATA.merchants.find(m => m.email === email && m.password === password);
    if (merchant) {
      setError('');
      onOTP(merchant);
    } else {
      setError('Invalid email or password. Use: maya@northwind.co / password123');
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Welcome back</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Sign in to your Smart POS workspace</div>
      <Field label="Email"><input style={inputCls} placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <div style={{ height: 12 }} />
      <Field label="Password">
        <div style={{ position: 'relative' }}>
          <input style={inputCls} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4, top: 4 }}><I.Eye size={12} /></button>
        </div>
      </Field>
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <window.Cbx checked={true} /> Remember this device
        </label>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onForgot}>Forgot password</button>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, height: 36, justifyContent: 'center' }} onClick={handleContinue}>Continue with email</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', color: 'var(--muted)', fontSize: 11 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />OR<div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button className="btn">Google</button>
        <button className="btn">SSO · Okta</button>
      </div>
      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        New to Smart POS? <a href="#" onClick={(e) => { e.preventDefault(); onSignup(); }} style={{ color: 'var(--ink)', fontWeight: 500 }}>Create account</a>
      </div>
    </div>
  );
};

const SignupPanel = ({ onBack, onNext }) => {
  const { Field } = window;
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Create workspace</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Step 1 of 3 — your business</div>
      <Field label="Workspace name"><input style={inputCls} placeholder="e.g. Northwind Hospitality" /></Field><div style={{ height: 12 }} />
      <Field label="Business type"><select style={inputCls}><option>Restaurant / QSR</option><option>Cafe / Coffee</option><option>Retail</option><option>Mixed</option></select></Field><div style={{ height: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Country"><select style={inputCls}><option>United States</option></select></Field>
        <Field label="Currency"><select style={inputCls}><option>USD ($)</option></select></Field>
      </div><div style={{ height: 12 }} />
      <Field label="Email"><input style={inputCls} placeholder="you@company.com" /></Field><div style={{ height: 12 }} />
      <Field label="Password"><input style={inputCls} type="password" placeholder="••••••••" /></Field>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 18, height: 36, justifyContent: 'center' }} onClick={onNext}>Continue →</button>
    </div>
  );
};

const ForgotPanel = ({ onBack }) => {
  const { Field } = window;
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Reset your password</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>We'll email you a reset link.</div>
      <Field label="Email"><input style={inputCls} placeholder="you@company.com" /></Field>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, height: 36, justifyContent: 'center' }}>Send reset link</button>
    </div>
  );
};

const OTPPanel = ({ merchant, onBack, onDone }) => {
  const { I } = window;
  const [code, setCode] = React.useState(['1', '7', '3', '', '', '']);
  const [error, setError] = React.useState('');

  const handleVerify = () => {
    if (code.every(c => c.trim() !== '')) {
      onDone();
    } else {
      setError('Please enter all 6 digits of the verification code.');
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Back</button>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Verify your device</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Enter the 6-digit code sent to <strong>{merchant?.email}</strong></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {code.map((c, i) => (
          <input key={i} value={c} maxLength={1}
            onChange={e => { const n = [...code]; n[i] = e.target.value; setCode(n); }}
            style={{
              width: 44, height: 52, fontSize: 22, textAlign: 'center', fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', outline: 'none'
            }} />
        ))}
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>{error}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, height: 36, justifyContent: 'center' }} onClick={handleVerify}>Verify & continue</button>
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Didn't receive it? <a href="#" style={{ color: 'var(--ink)' }}>Resend</a> · 0:42</div>
    </div>
  );
};

export default AuthScreen;

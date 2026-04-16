import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-25px, 20px); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 25px); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes formIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .user-button-wrap { display: none !important; }
        .hamburger-btn    { display: none !important; }

        /* ── Clerk SignIn overrides ── */
        .cl-rootBox  { width: 100%; }
        .cl-card     { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; width: 100% !important; }
        .cl-header   { display: none !important; }
        .cl-footer   { display: none !important; }
        .cl-socialButtonsBlockButton { display: none !important; }
        .cl-dividerRow  { display: none !important; }
        .cl-formFieldLabel {
          font-family: 'Courier New', monospace !important;
          font-size: 10px !important;
          color: #3f3f46 !important;
          letter-spacing: 0.1em !important;
          text-transform: uppercase !important;
        }
        .cl-formFieldInput {
          background: #0d1018 !important;
          border: 0.5px solid #1a1f2e !important;
          border-radius: 10px !important;
          color: #e4e4e7 !important;
          font-size: 14px !important;
          padding: 12px 14px !important;
          transition: border-color 0.2s ease !important;
        }
        .cl-formFieldInput:focus {
          border-color: #2a2f42 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .cl-formButtonPrimary {
          background: linear-gradient(135deg, #1e2340 0%, #141828 100%) !important;
          border: 0.5px solid #2a3060 !important;
          border-radius: 10px !important;
          color: #7b8cde !important;
          font-family: 'Courier New', monospace !important;
          font-size: 13px !important;
          letter-spacing: 0.08em !important;
          box-shadow: none !important;
          transition: background 0.2s ease !important;
        }
        .cl-formButtonPrimary:hover {
          background: linear-gradient(135deg, #252b4a 0%, #181e36 100%) !important;
        }
        .cl-formButtonPrimary:focus {
          box-shadow: none !important;
        }
        .cl-formResendCodeLink,
        .cl-footerActionLink,
        .cl-identityPreviewEditButton {
          color: #3f3f46 !important;
        }
        .cl-formFieldErrorText,
        .cl-formGlobalErrorText {
          color: #ef4444 !important;
          font-size: 11px !important;
        }
        .cl-internal-b3fm6y { display: none !important; }
        .cl-alternativeMethodsBlockButton {
          background: #0d1018 !important;
          border: 0.5px solid #1a1f2e !important;
          border-radius: 10px !important;
          color: #52525b !important;
        }

        @media (max-width: 640px) {
          .login-left       { display: none !important; }
          .login-right      { width: 100% !important; }
          .login-form-wrap  { padding: 40px 24px !important; }
        }
      `}} />

      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        background: '#09090b',
        zIndex: 200,
      }}>

        {/* ── Left panel ── */}
        <div className="login-left" style={{
          width: '45%',
          background: '#080910',
          borderRight: '0.5px solid #111118',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Aurora blobs */}
          <div style={{
            position: 'absolute', top: '-50px', left: '-50px',
            width: '400px', height: '400px',
            background: 'radial-gradient(#4f46e5, transparent 70%)',
            filter: 'blur(80px)', opacity: 0.25,
            animation: 'drift1 14s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', top: '-30px', right: '-60px',
            width: '350px', height: '350px',
            background: 'radial-gradient(#059669, transparent 70%)',
            filter: 'blur(80px)', opacity: 0.25,
            animation: 'drift2 18s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '20%',
            width: '250px', height: '250px',
            background: 'radial-gradient(#d97706, transparent 70%)',
            filter: 'blur(80px)', opacity: 0.25,
            animation: 'drift3 22s ease-in-out infinite',
          }} />

          {/* Hero content */}
          <div style={{
            position: 'relative', zIndex: 1,
            height: '100%', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '48px',
            animation: 'panelIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
          }}>
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '10px', color: '#3f3f46',
              letterSpacing: '0.25em', textTransform: 'uppercase',
              marginBottom: '24px',
            }}>
              NVDA JARVIS
            </div>
            <div style={{
              fontFamily: 'var(--font-inter-tight, var(--font-inter, sans-serif))',
              fontSize: '56px', fontWeight: 200,
              letterSpacing: '-3px', lineHeight: 1.1, color: '#fafafa',
            }}>
              Trade with<br />precision.
            </div>
            <div style={{
              fontFamily: 'var(--font-inter, sans-serif)',
              fontSize: '14px', fontWeight: 300,
              color: '#52525b', lineHeight: 1.6, marginTop: '16px',
            }}>
              AI-powered NVDA trading intelligence.<br />
              Built for serious decisions.
            </div>
          </div>

          {/* Live data strip */}
          <div style={{
            position: 'absolute', bottom: '32px', left: '32px', right: '32px',
            display: 'flex', gap: '20px', alignItems: 'center', zIndex: 1,
          }}>
            {[
              { label: 'NVDA', value: '$197.43', change: '+1.2%', up: true },
              { label: 'VIX',  value: '18.2',    change: 'LOW',     up: true },
              { label: 'QQQ',  value: '+0.8%',   change: 'BULLISH', up: true },
            ].map(item => (
              <div key={item.label} style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '8px', color: '#27272a', letterSpacing: '0.15em', marginBottom: '3px' }}>{item.label}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{item.value}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', color: item.up ? '#059669' : '#ef4444' }}>{item.change}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="login-right" style={{
          width: '55%',
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
        }}>
          <div className="login-form-wrap" style={{
            width: '100%',
            maxWidth: '360px',
            padding: '48px 40px',
            animation: 'formIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
          }}>

            {/* App mark */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1a1f2e 0%, #0d1018 100%)',
              border: '0.5px solid #1a1f2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '28px',
            }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #059669)' }} />
            </div>

            <div style={{
              fontFamily: 'var(--font-inter, sans-serif)',
              fontSize: '28px', fontWeight: 500, color: '#fafafa', marginBottom: '6px',
            }}>
              Welcome back
            </div>
            <div style={{
              fontFamily: 'var(--font-inter, sans-serif)',
              fontSize: '13px', fontWeight: 300, color: '#52525b', marginBottom: '32px',
            }}>
              Sign in to your trading dashboard
            </div>

            <SignIn
              routing="hash"
              afterSignInUrl="/"
              appearance={{
                variables: {
                  colorBackground:      '#09090b',
                  colorInputBackground: '#0d1018',
                  colorInputText:       '#e4e4e7',
                  colorText:            '#e4e4e7',
                  colorTextSecondary:   '#52525b',
                  colorPrimary:         '#6366f1',
                  colorDanger:          '#ef4444',
                  colorNeutral:         '#3f3f46',
                  borderRadius:         '10px',
                  fontFamily:           'var(--font-inter, sans-serif)',
                },
              }}
            />

            <p style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '10px', color: '#27272a',
              textAlign: 'center', marginTop: '24px', letterSpacing: '0.05em',
            }}>
              Access restricted · Authorised personnel only
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

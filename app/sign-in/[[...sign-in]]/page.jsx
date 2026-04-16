import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#0a0a0f',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>

      {/* Cloud 1 — large indigo bloom, top left */}
      <div style={{
        position: 'absolute',
        width: '700px',
        height: '700px',
        top: '-200px',
        left: '-150px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(67,56,202,0.45) 0%, rgba(67,56,202,0.15) 40%, transparent 70%)',
        filter: 'blur(80px)',
        animation: 'cloudDrift1 22s ease-in-out infinite',
        pointerEvents: 'none',
      }}/>

      {/* Cloud 2 — blue-indigo, top right */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        top: '-100px',
        right: '-100px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.1) 45%, transparent 70%)',
        filter: 'blur(90px)',
        animation: 'cloudDrift2 28s ease-in-out infinite',
        pointerEvents: 'none',
      }}/>

      {/* Cloud 3 — deep violet, bottom left */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        bottom: '-100px',
        left: '10%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(109,40,217,0.3) 0%, rgba(109,40,217,0.08) 50%, transparent 70%)',
        filter: 'blur(100px)',
        animation: 'cloudDrift3 34s ease-in-out infinite',
        pointerEvents: 'none',
      }}/>

      {/* Cloud 4 — soft blue, bottom right */}
      <div style={{
        position: 'absolute',
        width: '550px',
        height: '550px',
        bottom: '-150px',
        right: '5%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0.08) 50%, transparent 70%)',
        filter: 'blur(110px)',
        animation: 'cloudDrift1 26s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }}/>

      {/* Cloud 5 — centre ambient glow, very faint */}
      <div style={{
        position: 'absolute',
        width: '800px',
        height: '400px',
        top: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 65%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }}/>

      {/* Glass panel */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '0.5px solid rgba(255, 255, 255, 0.12)',
        boxShadow: `
          0 32px 80px rgba(0, 0, 0, 0.5),
          0 8px 24px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(255, 255, 255, 0.04)
        `,
        padding: '40px 36px 36px',
      }}>

        {/* App identity */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          {/* App mark */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(109,40,217,0.2) 100%)',
            border: '0.5px solid rgba(59,130,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 16px rgba(59,130,246,0.15)',
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.9)',
              boxShadow: '0 0 8px rgba(59,130,246,0.5)',
            }}/>
          </div>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '20px',
            fontWeight: '500',
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.3px',
            margin: '0 0 6px',
          }}>
            NVDA <span style={{ color: 'rgba(59,130,246,0.85)', fontWeight: '400' }}>Jarvis</span>
          </h1>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: '300',
            color: 'rgba(255,255,255,0.28)',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            Trading Terminal
          </p>
        </div>

        {/* Clerk SignIn */}
        <SignIn
          appearance={{
            elements: {
              rootBox: {
                width: '100%',
              },
              card: {
                background: 'transparent',
                boxShadow: 'none',
                border: 'none',
                padding: '0',
                width: '100%',
              },
              headerTitle: {
                display: 'none',
              },
              headerSubtitle: {
                display: 'none',
              },
              socialButtonsBlockButton: {
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.75)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                transition: 'all 0.2s ease',
              },
              socialButtonsBlockButton__hover: {
                background: 'rgba(255,255,255,0.09)',
                borderColor: 'rgba(255,255,255,0.18)',
              },
              dividerLine: {
                background: 'rgba(255,255,255,0.08)',
              },
              dividerText: {
                color: 'rgba(255,255,255,0.25)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
              },
              formFieldLabel: {
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              },
              formFieldInput: {
                background: 'rgba(0,0,0,0.25)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                padding: '10px 14px',
              },
              formFieldInput__focus: {
                borderColor: 'rgba(59,130,246,0.5)',
                boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
              },
              formButtonPrimary: {
                background: 'rgba(59,130,246,0.7)',
                borderRadius: '9999px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              },
              formButtonPrimary__hover: {
                background: 'rgba(59,130,246,0.85)',
                boxShadow: '0 6px 20px rgba(59,130,246,0.35)',
                transform: 'translateY(-1px)',
              },
              footerActionLink: {
                color: 'rgba(59,130,246,0.8)',
                fontFamily: 'Inter, sans-serif',
              },
              footerActionText: {
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
              },
              identityPreviewText: {
                color: 'rgba(255,255,255,0.7)',
              },
              identityPreviewEditButton: {
                color: 'rgba(59,130,246,0.8)',
              },
              alert: {
                background: 'rgba(239,68,68,0.08)',
                border: '0.5px solid rgba(239,68,68,0.2)',
                borderRadius: '8px',
              },
              alertText: {
                color: 'rgba(239,68,68,0.9)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
              },
            },
            variables: {
              colorBackground: 'transparent',
              colorInputBackground: 'rgba(0,0,0,0.2)',
              colorInputText: 'rgba(255,255,255,0.85)',
              colorText: 'rgba(255,255,255,0.75)',
              colorTextSecondary: 'rgba(255,255,255,0.4)',
              colorPrimary: 'rgba(59,130,246,0.85)',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const continueButton = document.querySelector('.cl-formButtonPrimary')
        if (continueButton) {
          continueButton.click()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      overflowY: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'transparent',
    }}>

      {/* CLOUD LAYER */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {/* Cloud 1 — large indigo, top left */}
        <div style={{
          position: 'absolute',
          width: '65vw',
          height: '65vw',
          maxWidth: '700px',
          maxHeight: '700px',
          top: '-20%',
          left: '-15%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(67,56,202,0.75) 0%, rgba(67,56,202,0.28) 35%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'cloudDrift1 22s ease-in-out infinite',
        }}/>

        {/* Cloud 2 — blue, top right */}
        <div style={{
          position: 'absolute',
          width: '55vw',
          height: '55vw',
          maxWidth: '600px',
          maxHeight: '600px',
          top: '-15%',
          right: '-10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(59,130,246,0.59) 0%, rgba(59,130,246,0.20) 40%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'cloudDrift2 28s ease-in-out infinite',
        }}/>

        {/* Cloud 3 — deep violet, bottom left */}
        <div style={{
          position: 'absolute',
          width: '50vw',
          height: '50vw',
          maxWidth: '550px',
          maxHeight: '550px',
          bottom: '-15%',
          left: '5%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(109,40,217,0.52) 0%, rgba(109,40,217,0.16) 45%, transparent 70%)',
          filter: 'blur(90px)',
          animation: 'cloudDrift3 34s ease-in-out infinite',
        }}/>

        {/* Cloud 4 — blue, bottom right */}
        <div style={{
          position: 'absolute',
          width: '50vw',
          height: '50vw',
          maxWidth: '550px',
          maxHeight: '550px',
          bottom: '-20%',
          right: '0%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(37,99,235,0.46) 0%, rgba(37,99,235,0.14) 50%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'cloudDrift1 26s ease-in-out infinite reverse',
        }}/>

        {/* Cloud 5 — faint centre ambient */}
        <div style={{
          position: 'absolute',
          width: '80vw',
          height: '40vw',
          maxWidth: '900px',
          maxHeight: '450px',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}/>
      </div>

      {/* GLASS PANEL WRAPPER */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '460px',
      }}>

        {/* Layer 1 — the actual glass blur layer, behind content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '28px',
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
          background: 'rgba(160, 180, 255, 0.08)',
          border: '0.5px solid rgba(255,255,255,0.18)',
          boxShadow: `
            0 32px 80px rgba(0,0,0,0.5),
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 0 60px rgba(160,180,255,0.05)
          `,
          zIndex: 0,
          pointerEvents: 'none',
        }}/>

        {/* Layer 2 — content sits on top, fully transparent background */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '36px 44px 36px 44px',
          background: 'transparent',
        }}>

          {/* Identity section */}
          <div style={{
            textAlign: 'center',
            paddingBottom: '20px',
            marginBottom: '8px',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(109,40,217,0.25))',
              border: '0.5px solid rgba(59,130,246,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 20px rgba(59,130,246,0.2)',
            }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'rgba(59,130,246,0.95)',
                boxShadow: '0 0 10px rgba(59,130,246,0.6)',
              }}/>
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: '500',
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.3px',
              marginBottom: '6px',
            }}>
              NVDA <span style={{
                color: 'rgba(59,130,246,0.9)',
                fontWeight: '400',
              }}>Jarvis</span>
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: '300',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Trading Terminal
            </div>
          </div>

          {/* Clerk SignIn */}
          <SignIn
            routing="hash"
            appearance={{
              layout: {
                showOptionalFields: false,
                logoPlacement: 'none',
              },
              variables: {
                colorBackground: 'transparent',
                colorInputBackground: 'rgba(0,0,0,0.2)',
                colorInputText: 'rgba(255,255,255,0.88)',
                colorText: 'rgba(255,255,255,0.75)',
                colorTextSecondary: 'rgba(255,255,255,0.38)',
                colorPrimary: '#3b82f6',
                colorDanger: '#ef4444',
                borderRadius: '10px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              },
              elements: {
                rootBox: {
                  width: '100%',
                  overflow: 'visible',
                },
                card: {
                  background: 'transparent',
                  boxShadow: 'none',
                  border: 'none',
                  padding: '0',
                  margin: '0',
                  width: '100%',
                  maxWidth: '100%',
                },
                cardBox: {
                  width: '100%',
                  maxWidth: '100%',
                  boxShadow: 'none',
                },
                header: {
                  display: 'none',
                },
                headerTitle: {
                  display: 'none',
                },
                headerSubtitle: {
                  display: 'none',
                },
                socialButtonsBlockButton: {
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '13px',
                  padding: '10px 16px',
                  transition: 'all 0.2s ease',
                },
                socialButtonsBlockButtonText: {
                  color: 'rgba(255,255,255,0.72)',
                  fontFamily: 'Inter, sans-serif',
                },
                dividerRow: {
                  margin: '4px 0',
                },
                dividerLine: {
                  background: 'rgba(255,255,255,0.07)',
                },
                dividerText: {
                  color: 'rgba(255,255,255,0.22)',
                  fontSize: '12px',
                },
                formFieldLabel: {
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                },
                formFieldInput: {
                  background: 'rgba(0, 0, 0, 0.28)',
                  border: '0.5px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '14px',
                  padding: '11px 14px',
                  fontFamily: 'Inter, sans-serif',
                },
                formFieldInputShowPasswordButton: {
                  color: 'rgba(255,255,255,0.35)',
                },
                formButtonPrimary: {
                  background: 'rgba(59,130,246,0.75)',
                  border: '0.5px solid rgba(59,130,246,0.4)',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.01em',
                  padding: '11px 24px',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  marginTop: '4px',
                },
                footerAction: {
                  marginTop: '8px',
                },
                footerActionText: {
                  color: 'rgba(255,255,255,0.28)',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif',
                },
                footerActionLink: {
                  color: 'rgba(59,130,246,0.85)',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif',
                },
                footer: {
                  background: 'transparent',
                  borderTop: 'none',
                  padding: '8px 0 0',
                },
                badge: {
                  display: 'none',
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
                  color: 'rgba(239,68,68,0.85)',
                  fontSize: '13px',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}

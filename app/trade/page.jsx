'use client'

export default function TradePage() {
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--color-bg, #080910)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '16px', padding: '24px',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(52,211,153,0.2) 0%, rgba(52,211,153,0.06) 100%)',
        border: '1px solid rgba(52,211,153,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', color: '#34d399',
      }}>◇</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: '22px', fontWeight: 300, color: '#eef2ff', marginBottom: '8px',
        }}>
          Pre-Trade Checklist
        </div>
        <div style={{ fontSize: '13px', color: '#3d4a5c', maxWidth: '280px', lineHeight: 1.6 }}>
          Enter price, shares and trade type.
          Get net P&L at target, interest erosion day and full checklist — available in Phase 4.
        </div>
      </div>
      <div style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
        padding: '4px 14px', borderRadius: '20px',
        color: '#fbbf24', background: 'rgba(251,191,36,0.1)',
        border: '1px solid rgba(251,191,36,0.2)',
        fontFamily: 'Inter, sans-serif',
      }}>
        PHASE 4
      </div>
    </div>
  )
}

'use client'

const ORB_STYLES = {
  INTACT:   { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
  'AT RISK':{ color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)' },
  BROKEN:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
  UNKNOWN:  { color: '#3d4a5c', bg: 'rgba(61,74,92,0.1)',     border: 'rgba(61,74,92,0.3)' },
}

const ICONS = { INTACT: '✦', 'AT RISK': '◉', BROKEN: '✕', UNKNOWN: '?' }

export default function ThesisStatus({ status = 'UNKNOWN', triggers = [] }) {
  const s = ORB_STYLES[status] || ORB_STYLES.UNKNOWN

  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.065)',
      borderRadius: '14px', padding: '18px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
        Thesis
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Animated orb */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: s.bg, border: `1px solid ${s.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: s.color,
          }}>
            {ICONS[status]}
          </div>
          {/* Spinning ring */}
          <div style={{
            position: 'absolute', inset: '-4px', borderRadius: '50%',
            border: `1.5px solid ${s.color}33`,
            animation: 'orbSpin 6s linear infinite',
          }} />
        </div>

        <div>
          <div style={{ fontSize: '10px', color: s.color + '88', letterSpacing: '0.1em', marginBottom: '3px' }}>STATUS</div>
          <div style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: '22px', fontWeight: 600, color: s.color,
          }}>
            {status}
          </div>
          {triggers.length > 0 && (
            <div style={{ fontSize: '11px', color: '#3d4a5c', marginTop: '4px', lineHeight: 1.5 }}>
              {triggers.join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Neural wave */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28px', overflow: 'hidden', opacity: 0.3, pointerEvents: 'none' }}>
        <div style={{
          width: '200%', height: '100%',
          background: `radial-gradient(ellipse 200px 20px at 25% 80%, ${s.color}66, transparent), radial-gradient(ellipse 200px 20px at 75% 80%, ${s.color}44, transparent)`,
          animation: 'waveMove 4s ease-in-out infinite alternate',
        }} />
      </div>
    </div>
  )
}

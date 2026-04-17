'use client'

/**
 * StatusPill — HUD-palette status badge for the J.A.R.V.I.S. interface.
 * Leading dot pulses when initialising or online (user's turn).
 */
const STATUS_MAP = {
  idle:       { label: 'STANDBY',       color: 'rgba(168,228,255,0.6)', bg: 'rgba(122,224,255,0.06)', border: 'rgba(122,224,255,0.15)', pulse: false, dim: false },
  connecting: { label: 'INITIALISING',  color: '#ffd89a',               bg: 'rgba(255,216,154,0.08)', border: 'rgba(255,216,154,0.25)', pulse: true,  dim: true  },
  listening:  { label: 'ONLINE',        color: '#7ae0ff',               bg: 'rgba(122,224,255,0.08)', border: 'rgba(122,224,255,0.25)', pulse: true,  dim: false },
  speaking:   { label: 'ENGAGED',       color: '#fff5e0',               bg: 'rgba(255,245,224,0.1)',  border: 'rgba(255,245,224,0.3)',  pulse: false, dim: false },
  error:      { label: 'FAULT',         color: '#ff6b6b',               bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.25)', pulse: false, dim: false },
}

export default function StatusPill({ status = 'idle' }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.idle

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
      style={{
        background:  s.bg,
        border:      `0.5px solid ${s.border}`,
      }}
    >
      <span
        style={{
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          background:   s.color,
          boxShadow:    s.pulse ? `0 0 6px ${s.color}` : 'none',
          animation:    s.pulse ? 'statusPillDot 1.2s ease-in-out infinite' : 'none',
          flexShrink:   0,
        }}
      />
      <span
        style={{
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:      '10px',
          fontWeight:    500,
          color:         s.color,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          animation:     s.dim ? 'statusPillLabel 1s ease-in-out infinite' : 'none',
        }}
      >
        {s.label}
      </span>

      <style>{`
        @keyframes statusPillDot {
          0%, 100% { opacity: 1;    transform: scale(1);   }
          50%      { opacity: 0.45; transform: scale(0.8); }
        }
        @keyframes statusPillLabel {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

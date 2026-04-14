const STYLES = {
  INTACT:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  'AT RISK':  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  BROKEN:     { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  CEASEFIRE:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  ESCALATING: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  WAR:        { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  UNKNOWN:    { color: '#3d4a5c', bg: 'rgba(61,74,92,0.1)',    border: 'rgba(61,74,92,0.25)' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const s = STYLES[status] || STYLES.UNKNOWN
  return (
    <span style={{
      display: 'inline-block',
      padding: size === 'sm' ? '2px 9px' : '4px 12px',
      borderRadius: '20px',
      border: `1px solid ${s.border}`,
      background: s.bg,
      color: s.color,
      fontSize: size === 'sm' ? '10px' : '12px',
      fontWeight: 600,
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  )
}

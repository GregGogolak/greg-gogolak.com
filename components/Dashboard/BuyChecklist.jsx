'use client'

export default function BuyChecklist({ items = [] }) {
  const passCount = items.filter(i => i.pass).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Entry Checklist</span>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 9px', borderRadius: '20px',
          color: passCount === 6 ? '#34d399' : '#fbbf24',
          background: passCount === 6 ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
          border: `1px solid ${passCount === 6 ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}`,
        }}>
          {passCount} / {items.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '7px 10px', borderRadius: '9px',
            background: 'rgba(255,255,255,0)',
            transition: 'background 0.15s',
          }}>
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700,
              color:       item.pass ? '#34d399' : '#f87171',
              background:  item.pass ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${item.pass ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            }}>
              {item.pass ? '✓' : '✗'}
            </div>
            <span style={{ fontSize: '12px', color: '#8892a8', flex: 1 }}>{item.label}</span>
            <span style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: '12px', fontWeight: 500,
              color: item.pass ? '#34d399' : '#f87171',
            }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

function formatAge(ageHours) {
  if (ageHours == null) return null
  if (ageHours < 1) return `${Math.round(ageHours * 60)}m`
  if (ageHours < 24) return `${Math.floor(ageHours)}h`
  return `${Math.floor(ageHours / 24)}d`
}

function Stars({ count }) {
  if (!count) return null
  const color = count >= 3 ? '#f59e0b' : '#4a5568'
  return (
    <span style={{ color, fontSize: '10px', letterSpacing: '1px', flexShrink: 0 }}>
      {'★'.repeat(count)}
    </span>
  )
}

function SignalRow({ article, dotColor }) {
  const age = formatAge(article.ageHours)
  return (
    <a
      href={article.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '6px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Dot */}
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: dotColor, flexShrink: 0,
        }} />
        {/* Headline */}
        <span style={{
          fontSize: '12px', color: '#c8cce8',
          fontFamily: 'Inter, sans-serif',
          flex: 1, overflow: 'hidden',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          lineHeight: 1.4,
        }}>
          {article.headline}
        </span>
        {/* Stars */}
        <Stars count={article.stars} />
        {/* Age */}
        {age && (
          <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
            {age}
          </span>
        )}
      </div>
    </a>
  )
}

export default function SignalFeed({ articles = [] }) {
  const signals = articles.filter(a => a.bucket === 'B' || a.bucket === 'C')

  const bullish = signals
    .filter(a => a.bucket === 'B')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)

  const bearish = signals
    .filter(a => a.bucket === 'C')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)

  const totalSignals = bullish.length + bearish.length
  const showDivider  = bullish.length > 0 && bearish.length > 0

  return (
    <div style={{
      background: '#0d1018',
      border: '0.5px solid #1a1f2e',
      borderRadius: '8px',
      padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{
          fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
          color: '#3d4a5c', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Signal Feed
        </span>
        <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'monospace' }}>
          {totalSignals > 0 ? `${totalSignals} ${totalSignals === 1 ? 'signal' : 'signals'}` : ''}
        </span>
      </div>

      {/* Empty state */}
      {bullish.length === 0 && bearish.length === 0 && (
        <div style={{ fontSize: '11px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif', padding: '6px 0' }}>
          No active signals — news is noise only
        </div>
      )}

      {/* Bullish section */}
      {bullish.length > 0 && (
        <div style={{ marginBottom: showDivider ? '10px' : 0 }}>
          <div style={{
            fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase',
            color: '#22c55e', letterSpacing: '0.08em', marginBottom: '4px',
          }}>
            Supporting
          </div>
          {bullish.map((article, i) => (
            <SignalRow key={article.id || `b-${i}`} article={article} dotColor="#22c55e" />
          ))}
        </div>
      )}

      {/* Divider */}
      {showDivider && (
        <div style={{ borderTop: '1px solid #1a1f2e', marginBottom: '10px' }} />
      )}

      {/* Bearish section */}
      {bearish.length > 0 && (
        <div>
          <div style={{
            fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase',
            color: '#ef4444', letterSpacing: '0.08em', marginBottom: '4px',
          }}>
            Risk
          </div>
          {bearish.map((article, i) => (
            <SignalRow key={article.id || `c-${i}`} article={article} dotColor="#ef4444" />
          ))}
        </div>
      )}
    </div>
  )
}

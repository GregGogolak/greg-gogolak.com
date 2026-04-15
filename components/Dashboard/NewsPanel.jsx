'use client'

const BUCKET_CONFIG = {
  A: { label: 'NOISE',  className: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
  B: { label: 'SIGNAL', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  C: { label: 'RISK',   className: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

function formatAge(ageHours) {
  if (ageHours == null) return null
  if (ageHours < 1) return `${Math.round(ageHours * 60)}m ago`
  if (ageHours < 24) return `${Math.floor(ageHours)}h ago`
  return `${Math.floor(ageHours / 24)}d ago`
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

function NewsItem({ article }) {
  const cfg = BUCKET_CONFIG[article.bucket] ?? BUCKET_CONFIG.A
  const age = formatAge(article.ageHours)

  return (
    <a
      href={article.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.045)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Top row: bucket pill + specificity + headline + stars */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
          {/* Bucket pill */}
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cfg.className}`}
            style={{ flexShrink: 0, marginTop: '1px' }}>
            {cfg.label}
          </span>
          {/* Specificity tag */}
          {article.specificity && (
            <span style={{
              fontSize: '10px', fontFamily: 'monospace',
              color: '#4a5568', flexShrink: 0, marginTop: '2px',
            }}>
              {article.specificity}
            </span>
          )}
          {/* Headline */}
          <span style={{
            fontSize: '12px', color: '#c4cbda', lineHeight: 1.45, flex: 1,
            fontFamily: 'Inter, sans-serif',
          }}>
            {article.headline}
          </span>
          {/* Stars */}
          <Stars count={article.stars} />
        </div>
        {/* Meta row */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: '4px' }}>
          <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif' }}>
            {article.source}
          </span>
          {age && <>
            <span style={{ fontSize: '10px', color: '#3d4a5c' }}>·</span>
            <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif' }}>
              {age}
            </span>
          </>}
        </div>
      </div>
    </a>
  )
}

export default function NewsPanel({ articles = [], loading }) {
  // Bucket C always first, then sort by score descending
  const sorted = [...articles].sort((a, b) => {
    if (a.bucket === 'C' && b.bucket !== 'C') return -1
    if (b.bucket === 'C' && a.bucket !== 'C') return 1
    return (b.score ?? 0) - (a.score ?? 0)
  })

  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.065)',
      borderRadius: '14px', padding: '18px',
      display: 'flex', flexDirection: 'column',
      maxHeight: '420px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          News Feed
        </span>
        <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif' }}>
          {articles.length > 0 ? `${articles.length} articles` : ''}
        </span>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', flex: 1 }} className="no-scrollbar">
        {loading && articles.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '50px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex: 1, height: '32px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ fontSize: '13px', color: '#3d4a5c', textAlign: 'center', padding: '20px 0' }}>
            No recent news
          </div>
        )}

        {sorted.map((article, i) => (
          <NewsItem key={article.id || i} article={article} />
        ))}
      </div>
    </div>
  )
}

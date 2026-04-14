'use client'

const BUCKET_META = {
  A: { label: 'NOISE',   color: '#3d4a5c', bg: 'rgba(61,74,92,0.15)',   border: 'rgba(61,74,92,0.3)' },
  B: { label: 'SUPPORT', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  C: { label: 'RISK',    color: '#f87171', bg: 'rgba(248,113,113,0.08)',border: 'rgba(248,113,113,0.2)' },
}

function relativeTime(unixTs) {
  const diff = Math.floor((Date.now() / 1000) - unixTs)
  if (diff < 60)        return `${diff}s ago`
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NewsItem({ article }) {
  // Phase 1: all articles shown as-is (no bucket classification yet)
  // Bucket classification is Phase 2 (newsClassifier.js)
  const bucket = article.bucket || 'A'
  const meta   = BUCKET_META[bucket] || BUCKET_META.A

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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          {/* Bucket pill */}
          <span style={{
            flexShrink: 0,
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
            padding: '1px 6px', borderRadius: '4px', marginTop: '1px',
            color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
            fontFamily: 'Inter, sans-serif',
          }}>
            {meta.label}
          </span>
          {/* Headline */}
          <span style={{
            fontSize: '12px', color: '#c4cbda', lineHeight: 1.45, flex: 1,
            fontFamily: 'Inter, sans-serif',
          }}>
            {article.headline}
          </span>
        </div>
        {/* Meta row */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: '52px' }}>
          <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif' }}>
            {article.source}
          </span>
          <span style={{ fontSize: '10px', color: '#3d4a5c' }}>·</span>
          <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif' }}>
            {relativeTime(article.datetime)}
          </span>
        </div>
      </div>
    </a>
  )
}

export default function NewsPanel({ articles = [], loading }) {
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

        {articles.map((article, i) => (
          <NewsItem key={article.id || i} article={article} />
        ))}
      </div>
    </div>
  )
}

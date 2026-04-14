'use client'
import Sparkline from './Sparkline'
import { fmtPrice, fmtPct } from '@/lib/calculations'

const card = {
  background: 'rgba(255,255,255,0.028)',
  border: '1px solid rgba(255,255,255,0.065)',
  borderRadius: '14px', padding: '18px',
  display: 'flex', flexDirection: 'column',
  gap: '14px',
}

const label = { fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase' }

export default function PricePanel({ data, loading }) {
  const dn = !loading && data?.pctChange < 0

  return (
    <>
      {/* Price hero + chart */}
      <div style={{ ...card, flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Scan line animation */}
        <style>{`
          @keyframes scan { 0%{left:-100%} 60%{left:100%} 100%{left:100%} }
          .scan-line { position:absolute;top:0;height:1px;width:60%;background:linear-gradient(90deg,transparent,rgba(91,156,246,0.4),transparent);animation:scan 4s ease-in-out infinite;pointer-events:none; }
        `}</style>
        <div className="scan-line" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...label, marginBottom: '8px' }}>NVDA · NASDAQ</div>
            <div style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: '52px', fontWeight: 300, letterSpacing: '-2.5px',
              color: '#eef2ff', lineHeight: 1,
              animation: 'priceGlow 3s ease-in-out infinite',
            }}>
              {loading ? '—' : fmtPrice(data?.price)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <span style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: '14px', fontWeight: 500,
                padding: '3px 10px', borderRadius: '8px',
                color: dn ? '#f87171' : '#34d399',
                background: dn ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
              }}>
                {loading ? '—' : `${dn ? '▼' : '▲'} ${fmtPct(data?.pctChange)}`}
              </span>
              <span style={{ fontSize: '12px', color: '#3d4a5c' }}>
                Prev {loading ? '—' : fmtPrice(data?.prevClose)}
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Sparkline prices={data?.sparkline || []} sma200={data?.sma200} />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '11px', color: '#3d4a5c' }}>
            <span>60 days</span>
            <span style={{ fontSize: '10px' }}>
              {data?.sparkline?.length ? `$${Math.min(...data.sparkline).toFixed(0)} — $${Math.max(...data.sparkline).toFixed(0)}` : ''}
            </span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* SMA + analyst */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={label}>SMA Distance</span>
          {data?.price && data?.sma200 && (
            <span style={{ fontSize: '11px', color: '#3d4a5c' }}>Current {fmtPrice(data.price)}</span>
          )}
        </div>

        <SmaRow label="200-day" sublabel={data?.sma200 ? fmtPrice(data.sma200) : null}
          pct={data?.pctFrom200} loading={loading} />
        <SmaRow label="50-day"  sublabel={data?.sma50  ? fmtPrice(data.sma50)  : null}
          pct={data?.pctFrom50}  loading={loading} />

        {/* Analyst target */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.065)' }}>
          <span style={{ fontSize: '13px', color: '#8892a8' }}>Analyst consensus</span>
          <div style={{ textAlign: 'right' }}>
            {data?.analystTarget && (
              <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '15px', fontWeight: 600, color: '#5b9cf6' }}>
                {data.price ? fmtPct((data.analystTarget - data.price) / data.price * 100) : '+—'}
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#3d4a5c', marginLeft: '6px' }}>target $264</span>
          </div>
        </div>
      </div>
    </>
  )
}

function SmaRow({ label: name, sublabel, pct, loading }) {
  const isNeg = pct < 0
  const fillW = pct == null ? 0 : Math.min(100, Math.abs(pct) * 4)  // scale to bar width

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', color: '#8892a8' }}>
          {name} {sublabel && <span style={{ fontSize: '11px', color: '#3d4a5c', marginLeft: '4px' }}>{sublabel}</span>}
        </span>
        <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '14px', fontWeight: 500, color: loading ? '#3d4a5c' : (isNeg ? '#f87171' : '#34d399') }}>
          {loading ? '—' : fmtPct(pct)}
        </span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          width: `${fillW}%`,
          background: isNeg
            ? 'linear-gradient(90deg, rgba(248,113,113,0.3), #f87171)'
            : 'linear-gradient(90deg, rgba(52,211,153,0.3), #34d399)',
          transition: 'width 1.2s cubic-bezier(0.25,1,0.5,1)',
        }} />
      </div>
    </div>
  )
}

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

export default function PricePanel({ data, loading, analystTarget }) {
  const sp7  = data?.sparkline7d  || []
  const sp30 = data?.sparkline30d || []

  const pct7  = sp7.length  > 1 ? ((sp7[sp7.length - 1]   - sp7[0])   / sp7[0])   * 100 : null
  const pct30 = sp30.length > 1 ? ((sp30[sp30.length - 1]  - sp30[0])  / sp30[0])  * 100 : null

  const up7  = pct7  == null || pct7  >= 0
  const up30 = pct30 == null || pct30 >= 0

  const rangeOf = arr => arr.length ? `$${Math.min(...arr).toFixed(0)} — $${Math.max(...arr).toFixed(0)}` : ''

  return (
    <>
      <style>{`
        @keyframes scan { 0%{left:-100%} 60%{left:100%} 100%{left:100%} }
        .scan-line { position:absolute;top:0;height:1px;width:60%;background:linear-gradient(90deg,transparent,rgba(91,156,246,0.4),transparent);animation:scan 4s ease-in-out infinite;pointer-events:none; }
      `}</style>

      {/* 1W Chart bubble */}
      <div style={{ ...card, flex: 1, minHeight: '180px', position: 'relative', overflow: 'hidden', gap: '10px' }}>
        <div className="scan-line" />
        {/* Bottom glow */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', pointerEvents: 'none',
          background: up7 ? 'radial-gradient(ellipse 80% 40px at 50% 100%, rgba(52,211,153,0.08), transparent)'
                          : 'radial-gradient(ellipse 80% 40px at 50% 100%, rgba(248,113,113,0.08), transparent)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={label}>1 Week</div>
            <div style={{ fontSize: '10px', color: '#3d4a5c', marginTop: '2px' }}>5 trading days</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {pct7 != null && (
              <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '20px', fontWeight: 500,
                color: up7 ? '#34d399' : '#f87171' }}>
                {up7 ? '+' : ''}{pct7.toFixed(2)}%
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#3d4a5c', marginTop: '2px' }}>{rangeOf(sp7)}</div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Sparkline prices={sp7} />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px', fontSize: '10px', color: '#3d4a5c' }}>
            <span>5d ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* 1M Chart bubble */}
      <div style={{ ...card, flex: 1, minHeight: '180px', position: 'relative', overflow: 'hidden', gap: '10px' }}>
        <div className="scan-line" />
        {/* Bottom glow */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', pointerEvents: 'none',
          background: up30 ? 'radial-gradient(ellipse 80% 40px at 50% 100%, rgba(52,211,153,0.08), transparent)'
                           : 'radial-gradient(ellipse 80% 40px at 50% 100%, rgba(248,113,113,0.08), transparent)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={label}>1 Month</div>
            <div style={{ fontSize: '10px', color: '#3d4a5c', marginTop: '2px' }}>22 trading days</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {pct30 != null && (
              <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '20px', fontWeight: 500,
                color: up30 ? '#34d399' : '#f87171' }}>
                {up30 ? '+' : ''}{pct30.toFixed(2)}%
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#3d4a5c', marginTop: '2px' }}>{rangeOf(sp30)}</div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Sparkline prices={sp30} sma200={data?.sma200} />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px', fontSize: '10px', color: '#3d4a5c' }}>
            <span>22d ago</span>
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

        {/* Volume + 10d high */}
        <div style={{ display: 'flex', gap: '0', borderTop: '1px solid rgba(255,255,255,0.065)', paddingTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#3d4a5c', marginBottom: '3px' }}>Vol vs Avg</div>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '14px', fontWeight: 500,
              color: loading || data?.volumeRatio == null ? '#3d4a5c'
                : data.volumeRatio >= 1.5 ? '#fbbf24'
                : data.volumeRatio >= 1   ? '#34d399'
                : '#8892a8',
            }}>
              {loading || data?.volumeRatio == null ? '—' : `${data.volumeRatio.toFixed(1)}x`}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#3d4a5c', marginBottom: '3px' }}>% from 10d high</div>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '14px', fontWeight: 500,
              color: loading || data?.pctBelowHigh == null ? '#3d4a5c'
                : data.pctBelowHigh <= 1 ? '#34d399'
                : data.pctBelowHigh <= 5 ? '#fbbf24'
                : '#f87171',
            }}>
              {loading || data?.pctBelowHigh == null ? '—' : `-${data.pctBelowHigh.toFixed(1)}%`}
            </div>
          </div>
        </div>

        {/* Analyst target */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.065)' }}>
          <span style={{ fontSize: '13px', color: '#8892a8' }}>Analyst consensus</span>
          <div style={{ textAlign: 'right' }}>
            {analystTarget && data?.price && (
              <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '15px', fontWeight: 600, color: '#5b9cf6' }}>
                {fmtPct((analystTarget - data.price) / data.price * 100)}
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#3d4a5c', marginLeft: '6px' }}>target {fmtPrice(analystTarget)}</span>
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

'use client'
import { fmtPct } from '@/lib/calculations'

function chgColor(v) {
  if (v == null) return '#3d4a5c'
  if (v > 2)    return '#fb923c'
  if (v > 0)    return '#fbbf24'
  if (v < -1.5) return '#f87171'
  return '#34d399'
}

function MacroRow({ name, value, change, changeLabel, loading }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.065)',
    }}>
      <span style={{ fontSize: '13px', color: '#8892a8' }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        {value != null && (
          <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '16px', fontWeight: 400, color: '#eef2ff' }}>
            {loading ? '—' : value}
          </span>
        )}
        {change != null && (
          <span style={{
            fontSize: '11px', fontWeight: 500,
            padding: '1px 7px', borderRadius: '5px',
            color: chgColor(change),
            background: chgColor(change) + '18',
          }}>
            {loading ? '—' : (changeLabel || fmtPct(change))}
          </span>
        )}
      </div>
    </div>
  )
}

export default function MacroPanel({ data, loading }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.065)',
      borderRadius: '14px', padding: '18px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
        Macro Signals
      </div>
      <div>
        <MacroRow
          name="Brent Crude"
          value={data?.oil?.price ? `$${data.oil.price.toFixed(2)}` : null}
          change={data?.oil?.pctChange}
          loading={loading}
        />
        <MacroRow
          name="QQQ"
          value={null}
          change={data?.qqq?.pctChange}
          loading={loading}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px' }}>
          <span style={{ fontSize: '13px', color: '#8892a8' }}>VIX</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontFamily: "'Inter Tight', sans-serif", fontSize: '16px', fontWeight: 400,
              color: !loading && data?.vix?.level > 30 ? '#f87171' : !loading && data?.vix?.level > 20 ? '#fbbf24' : '#34d399',
            }}>
              {loading || !data?.vix ? '—' : data.vix.level.toFixed(1)}
            </span>
            {!loading && data?.vix?.level && (
              <span style={{
                fontSize: '11px', fontWeight: 500, padding: '1px 7px', borderRadius: '5px',
                color: data.vix.level > 30 ? '#f87171' : data.vix.level > 20 ? '#fbbf24' : '#34d399',
                background: (data.vix.level > 30 ? 'rgba(248,113,113,' : data.vix.level > 20 ? 'rgba(251,191,36,' : 'rgba(52,211,153,') + '0.1)',
              }}>
                {data.vix.level > 30 ? 'Fear' : data.vix.level > 20 ? 'Elevated' : 'Low'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

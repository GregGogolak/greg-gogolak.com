'use client'
import { useState } from 'react'
import { useAlerts }  from '@/hooks/useAlerts'
import { iconFor }    from '@/lib/alertEngine'

// ── Shared card style ────────────────────────────────────────────────────────
const card = {
  background:   'rgba(255,255,255,0.028)',
  border:       '1px solid rgba(255,255,255,0.065)',
  borderRadius: '14px',
  padding:      '18px',
}

const inputStyle = {
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px',
  padding:      '6px 10px',
  color:        '#eef2ff',
  fontSize:     '12px',
  fontFamily:   'monospace',
  outline:      'none',
}

// ── Toggle pill ───────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        position:       'relative',
        width:          '40px',
        height:         '22px',
        borderRadius:   '11px',
        flexShrink:     0,
        cursor:         'pointer',
        transition:     'background 0.2s',
        background:     value ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)',
        border:         value ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.1)',
        boxSizing:      'border-box',
      }}
    >
      <div style={{
        position:       'absolute',
        top:            '2px',
        width:          '16px',
        height:         '16px',
        borderRadius:   '50%',
        background:     value ? '#fff' : '#3d4a5c',
        transform:      value ? 'translateX(18px)' : 'translateX(2px)',
        transition:     'transform 0.2s, background 0.2s',
      }} />
    </div>
  )
}

// ── Configure card ────────────────────────────────────────────────────────────
const TOGGLE_ROWS = [
  { key: 'priceDrop',       label: 'Price drop >2%',         desc: 'From open or rolling 2hr window' },
  { key: 'oilMove',         label: 'Oil move >3%',           desc: 'Brent crude spike or drop' },
  { key: 'interestErosion', label: 'Interest erosion >20%',  desc: 'On any open CONVICTION position' },
  { key: 'earnings14d',     label: 'Earnings: 14 days',      desc: 'Early reminder, May 20' },
  { key: 'earnings3d',      label: 'Earnings: 3 days',       desc: 'Final warning, May 20' },
]

function ConfigureCard({ config, setConfig }) {
  return (
    <div style={card}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Configure
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {TOGGLE_ROWS.map((row, i) => (
          <div key={row.key} style={{
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
            gap:           '12px',
            padding:       '10px 0',
            borderTop:     i === 0 ? 'none' : '1px solid rgba(255,255,255,0.045)',
          }}>
            <div>
              <div style={{ fontSize: '13px', color: '#eef2ff', marginBottom: '2px' }}>{row.label}</div>
              <div style={{ fontSize: '11px', color: '#3d4a5c' }}>{row.desc}</div>
            </div>
            <Toggle
              value={config[row.key]}
              onChange={v => setConfig({ ...config, [row.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Custom price levels card ──────────────────────────────────────────────────
function CustomLevelsCard({ customLevels, addCustomLevel, removeCustomLevel }) {
  const [price,     setPrice]     = useState('')
  const [direction, setDirection] = useState('above')
  const [label,     setLabel]     = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!price) return
    await addCustomLevel({ price: parseFloat(price), direction, label })
    setPrice('')
    setLabel('')
  }

  return (
    <div style={{ ...card, marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
        Custom Price Levels
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input
          type="number"
          step="0.01"
          placeholder="$0.00"
          value={price}
          onChange={e => setPrice(e.target.value)}
          style={{ ...inputStyle, width: '88px' }}
        />

        {/* Direction pills */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['above', 'below'].map(d => (
            <button key={d} type="button" onClick={() => setDirection(d)} style={{
              padding:    '6px 10px',
              borderRadius: '7px',
              cursor:     'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize:   '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              border:     direction === d
                ? (d === 'above' ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(248,113,113,0.4)')
                : '1px solid rgba(255,255,255,0.065)',
              background: direction === d
                ? (d === 'above' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)')
                : 'transparent',
              color: direction === d
                ? (d === 'above' ? '#34d399' : '#f87171')
                : '#3d4a5c',
            }}>
              {d}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Label (optional)"
          value={label}
          onChange={e => setLabel(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: '100px' }}
        />

        <button type="submit" disabled={!price} style={{
          background:   price ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
          border:       price ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.065)',
          color:        price ? '#34d399' : '#3d4a5c',
          borderRadius: '7px',
          padding:      '6px 14px',
          fontSize:     '12px',
          fontWeight:   600,
          cursor:       price ? 'pointer' : 'default',
          fontFamily:   'Inter, sans-serif',
        }}>
          Add
        </button>
      </form>

      {/* Existing levels */}
      {customLevels.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#3d4a5c', textAlign: 'center', padding: '6px 0' }}>
          No custom levels set
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {customLevels.map((level, i) => (
            <div key={level.id} style={{
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
              padding:       '8px 0',
              borderTop:     i === 0 ? 'none' : '1px solid rgba(255,255,255,0.045)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize:   '13px',
                  fontWeight: 600,
                  color:      level.direction === 'above' ? '#34d399' : '#f87171',
                }}>
                  ${parseFloat(level.price).toFixed(2)}
                </span>
                <span style={{
                  fontSize:      '10px',
                  fontWeight:    600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color:         level.direction === 'above' ? '#34d399' : '#f87171',
                  opacity:       0.7,
                }}>
                  {level.direction}
                </span>
                {level.label && (
                  <span style={{ fontSize: '11px', color: '#8892a8' }}>{level.label}</span>
                )}
              </div>
              <button onClick={() => removeCustomLevel(level.id)} style={{
                background: 'none',
                border:     'none',
                color:      '#3d4a5c',
                fontSize:   '16px',
                cursor:     'pointer',
                padding:    '0 2px',
                lineHeight: 1,
              }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Active Now card ───────────────────────────────────────────────────────────
function ActiveNowCard({ alerts, dismissAlert }) {
  return (
    <div style={card}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
        Active Now
      </div>

      {alerts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '40px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#3d4a5c' }}>All clear · No conditions triggered</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {alerts.map((alert, i) => (
            <div key={alert.id} style={{
              display:     'flex',
              gap:         '12px',
              padding:     '10px 10px 10px 14px',
              marginBottom: i < alerts.length - 1 ? '6px' : 0,
              background:  'rgba(255,255,255,0.018)',
              borderRadius:'10px',
              borderLeft:  `3px solid ${alert.color}`,
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{iconFor(alert.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: alert.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>
                      {alert.type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '13px', color: '#eef2ff', fontWeight: 500 }}>{alert.message}</div>
                    {alert.detail && (
                      <div style={{ fontSize: '11px', color: '#8892a8', fontFamily: 'monospace', marginTop: '2px' }}>{alert.detail}</div>
                    )}
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} style={{
                    background: 'none', border: 'none', color: '#3d4a5c',
                    fontSize: '16px', cursor: 'pointer', padding: '0 2px', flexShrink: 0,
                  }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const {
    alerts, dismissAlert,
    config, setConfig, configLoaded,
    customLevels, addCustomLevel, removeCustomLevel,
  } = useAlerts()

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg, #080910)', color: '#eef2ff' }}>

      {/* Sticky header */}
      <div style={{
        position:       'sticky',
        top:            0,
        zIndex:         10,
        background:     'rgba(8,9,16,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom:   '1px solid rgba(255,255,255,0.065)',
        padding:        '14px 20px',
        display:        'flex',
        alignItems:     'center',
        gap:            '10px',
      }}>
        <span style={{ fontSize: '16px', color: '#f87171' }}>◉</span>
        <span style={{
          fontFamily:    "'Inter Tight', sans-serif",
          fontSize:      '16px',
          fontWeight:    600,
          color:         '#eef2ff',
          letterSpacing: '-0.01em',
        }}>Alert System</span>

        {alerts.length > 0 && (
          <span style={{
            marginLeft:  'auto',
            fontSize:    '10px',
            fontWeight:  700,
            letterSpacing: '0.06em',
            padding:     '2px 8px',
            borderRadius:'10px',
            color:       '#f87171',
            background:  'rgba(248,113,113,0.12)',
            border:      '1px solid rgba(248,113,113,0.25)',
          }}>
            {alerts.length} ACTIVE
          </span>
        )}
      </div>

      {/* Two-column grid */}
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '16px', alignItems: 'start' }}>

          {/* LEFT — Active Now */}
          <div>
            <ActiveNowCard alerts={alerts} dismissAlert={dismissAlert} />
          </div>

          {/* RIGHT — Configure + Custom Levels */}
          <div>
            {configLoaded ? (
              <ConfigureCard config={config} setConfig={setConfig} />
            ) : (
              <div style={{ ...card, height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', color: '#3d4a5c' }}>Loading…</span>
              </div>
            )}
            <CustomLevelsCard
              customLevels={customLevels}
              addCustomLevel={addCustomLevel}
              removeCustomLevel={removeCustomLevel}
            />
          </div>

        </div>
      </div>

    </div>
  )
}

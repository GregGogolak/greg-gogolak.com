'use client'
import { useAlerts } from '@/hooks/useAlerts'
import { iconFor }   from '@/lib/alertEngine'

export default function AlertBanner() {
  const { alerts, dismissAlert, configLoaded } = useAlerts()

  // Don't render until config is loaded (prevents flash)
  if (!configLoaded || alerts.length === 0) return null

  // Show max 3 banners stacked
  const visible = alerts.slice(0, 3)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 80,
    }}>
      {visible.map((alert, i) => (
        <div key={alert.id} style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '10px',
          height:         '48px',
          paddingLeft:    '14px',
          paddingRight:   '12px',
          background:     'rgba(8,9,16,0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom:   '1px solid rgba(255,255,255,0.065)',
          borderLeft:     `3px solid ${alert.color}`,
          boxSizing:      'border-box',
        }}>
          {/* Icon */}
          <span style={{ fontSize: '15px', flexShrink: 0 }}>
            {iconFor(alert.type)}
          </span>

          {/* Message + detail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize:     '13px',
              fontWeight:   500,
              color:        alert.color,
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              {alert.message}
            </div>
            {alert.detail && (
              <div style={{
                fontSize:     '11px',
                color:        '#8892a8',
                fontFamily:   'monospace',
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
              }}>
                {alert.detail}
              </div>
            )}
          </div>

          {/* Queue indicator */}
          {i === 0 && alerts.length > 3 && (
            <span style={{ fontSize: '10px', color: '#3d4a5c', flexShrink: 0 }}>
              +{alerts.length - 3}
            </span>
          )}

          {/* Dismiss */}
          <button
            onClick={() => dismissAlert(alert.id)}
            style={{
              background:  'none',
              border:      'none',
              color:       '#3d4a5c',
              fontSize:    '18px',
              lineHeight:  1,
              cursor:      'pointer',
              padding:     '0 2px',
              flexShrink:  0,
              fontFamily:  'Inter, sans-serif',
            }}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

"use client";

const TICKS_OUTER_COUNT = 72;
const TICKS_INNER_COUNT = 120;

const deg2rad = (d) => (d * Math.PI) / 180;
const pt = (r, angleDeg) => {
  const a = deg2rad(angleDeg);
  return [r * Math.cos(a), r * Math.sin(a)];
};

const compassPoints = [
  { label: "N",  angle: -90  },
  { label: "NE", angle: -45  },
  { label: "E",  angle:   0  },
  { label: "SE", angle:  45  },
  { label: "S",  angle:  90  },
  { label: "SW", angle: 135  },
  { label: "W",  angle: 180  },
  { label: "NW", angle: -135 },
];

const corners = [
  { key: "tl", cx: -420, cy: -420, dx:  10, dy:  10, align: "start", textX: -408, textYStart: -408, diagSign: { x: -1, y: -1 } },
  { key: "tr", cx:  420, cy: -420, dx: -10, dy:  10, align: "end",   textX:  408, textYStart: -408, diagSign: { x:  1, y: -1 } },
  { key: "bl", cx: -420, cy:  420, dx:  10, dy: -10, align: "start", textX: -408, textYStart:  381, diagSign: { x: -1, y:  1 } },
  { key: "br", cx:  420, cy:  420, dx: -10, dy: -10, align: "end",   textX:  408, textYStart:  381, diagSign: { x:  1, y:  1 } },
];

const viewportBrackets = [
  { x: -490, y: -490, dx:  25, dy:  25 },
  { x:  490, y: -490, dx: -25, dy:  25 },
  { x: -490, y:  490, dx:  25, dy: -25 },
  { x:  490, y:  490, dx: -25, dy: -25 },
];

const outerTicks = Array.from({ length: TICKS_OUTER_COUNT }, (_, i) => {
  const angle = i * 5;
  const long = i % 9 === 0;
  const r1 = long ? 430 : 436;
  const r2 = long ? 450 : 444;
  const [x1, y1] = pt(r1, angle);
  const [x2, y2] = pt(r2, angle);
  return { x1, y1, x2, y2, long };
});

const innerTicks = Array.from({ length: TICKS_INNER_COUNT }, (_, i) => {
  const angle = i * 3;
  const long = i % 10 === 0;
  const r1 = long ? 272 : 276;
  const r2 = long ? 288 : 284;
  const [x1, y1] = pt(r1, angle);
  const [x2, y2] = pt(r2, angle);
  return { x1, y1, x2, y2, long };
});

export default function HUDOverlay({ status = "idle", bootPhase = 1, telemetry = null }) {
  const opacity = Math.max(0, Math.min(1, bootPhase));

  const t = telemetry ?? {
    coordinates:      { lat: "— — —", lng: "— — —" },
    integrity:        "—.—%",
    frequency:        "OFFLINE",
    stream_id:        "———",
    encoding:         "OPUS 48K",
    uptime:           "—:—:—",
    voice_confidence: "—.—%",
  };

  const cornerContent = {
    tl: ["COORD", t.coordinates?.lat ?? "—", t.coordinates?.lng ?? "—"],
    tr: ["SIGNAL", `INT ${t.integrity}`, `FRQ ${t.frequency}`],
    bl: ["STREAM", `ID ${t.stream_id}`, t.encoding],
    br: ["STATUS", `UPTIME ${t.uptime}`, `CONF ${t.voice_confidence}`],
  };

  const INV_SQRT2 = 1 / Math.sqrt(2);
  const connectorStartR = 570;
  const connectorEndR   = 480;

  return (
    <svg
      viewBox="-500 -500 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        opacity,
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes hudRotateCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes hudRotateCW  { from { transform: rotate(0deg); } to { transform: rotate( 360deg); } }
        .hud-ring-outer       { animation: hudRotateCCW 240s linear infinite; transform-origin: 0 0; transform-box: view-box; }
        .hud-ring-mid         { animation: hudRotateCW   90s linear infinite; transform-origin: 0 0; transform-box: view-box; }
        .hud-ring-inner       { animation: hudRotateCCW  45s linear infinite; transform-origin: 0 0; transform-box: view-box; }
        .hud-ring-containment { animation: hudRotateCW  120s linear infinite; transform-origin: 0 0; transform-box: view-box; }
      `}</style>

      {/* A) Outer tick ring at r=440 */}
      <g className="hud-ring-outer">
        <circle cx="0" cy="0" r="440" fill="none" stroke="rgba(122,224,255,0.15)" strokeWidth="0.8" />
        {outerTicks.map((tick, i) => (
          <line
            key={`ot-${i}`}
            x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2}
            stroke={tick.long ? "rgba(122,224,255,0.6)" : "rgba(122,224,255,0.3)"}
            strokeWidth={tick.long ? 1 : 0.6}
          />
        ))}
        {compassPoints.map((c) => {
          const [x, y] = pt(465, c.angle);
          return (
            <text
              key={`cp-${c.label}`}
              x={x} y={y}
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              fill="rgba(168,228,255,0.5)"
              textAnchor="middle"
              dominantBaseline="middle"
            >{c.label}</text>
          );
        })}
      </g>

      {/* B) Mid dashed ring at r=360 */}
      <g className="hud-ring-mid">
        <circle
          cx="0" cy="0" r="360"
          fill="none"
          stroke="rgba(122,224,255,0.3)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      </g>

      {/* C) Inner fine tick ring at r=280 */}
      <g className="hud-ring-inner">
        <circle cx="0" cy="0" r="280" fill="none" stroke="rgba(122,224,255,0.15)" strokeWidth="0.5" />
        {innerTicks.map((tick, i) => (
          <line
            key={`it-${i}`}
            x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2}
            stroke={tick.long ? "rgba(122,224,255,0.55)" : "rgba(122,224,255,0.25)"}
            strokeWidth={tick.long ? 0.8 : 0.5}
          />
        ))}
      </g>

      {/* D) Containment ring at r=220 */}
      <g className="hud-ring-containment">
        <circle
          cx="0" cy="0" r="220"
          fill="none"
          stroke="rgba(122,224,255,0.5)"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          style={{ filter: "drop-shadow(0 0 8px rgba(122,224,255,0.4))" }}
        />
      </g>

      {/* E) Four corner telemetry blocks */}
      {corners.map((c) => {
        const lines = cornerContent[c.key];
        const bracketV = { x1: c.cx, y1: c.cy, x2: c.cx,          y2: c.cy + c.dy };
        const bracketH = { x1: c.cx, y1: c.cy, x2: c.cx + c.dx,   y2: c.cy        };
        const connector = {
          x1: c.diagSign.x * connectorStartR * INV_SQRT2,
          y1: c.diagSign.y * connectorStartR * INV_SQRT2,
          x2: c.diagSign.x * connectorEndR   * INV_SQRT2,
          y2: c.diagSign.y * connectorEndR   * INV_SQRT2,
        };
        return (
          <g key={c.key}>
            <line x1={bracketV.x1} y1={bracketV.y1} x2={bracketV.x2} y2={bracketV.y2} stroke="rgba(122,224,255,0.6)" strokeWidth="1.5" />
            <line x1={bracketH.x1} y1={bracketH.y1} x2={bracketH.x2} y2={bracketH.y2} stroke="rgba(122,224,255,0.6)" strokeWidth="1.5" />
            <line x1={connector.x1} y1={connector.y1} x2={connector.x2} y2={connector.y2} stroke="rgba(122,224,255,0.25)" strokeWidth="0.6" />
            {lines.map((txt, i) => (
              <text
                key={`${c.key}-${i}`}
                x={c.textX} y={c.textYStart + i * 13}
                fontFamily="JetBrains Mono, monospace"
                fontSize="10"
                fill="rgba(168,228,255,0.7)"
                textAnchor={c.align}
                dominantBaseline="hanging"
              >{txt}</text>
            ))}
          </g>
        );
      })}

      {/* F) Four diagonal corner brackets at viewport edges */}
      {viewportBrackets.map((c, i) => (
        <g key={`vp-${i}`}>
          <line x1={c.x} y1={c.y} x2={c.x + c.dx} y2={c.y}          stroke="rgba(122,224,255,0.4)" strokeWidth="1" />
          <line x1={c.x} y1={c.y} x2={c.x}        y2={c.y + c.dy}   stroke="rgba(122,224,255,0.4)" strokeWidth="1" />
        </g>
      ))}

      {/* G) Centre crosshair */}
      <g>
        <line x1="-16" y1="0"  x2="16" y2="0"  stroke="rgba(122,224,255,0.2)" strokeWidth="1" />
        <line x1="0"  y1="-16" x2="0"  y2="16" stroke="rgba(122,224,255,0.2)" strokeWidth="1" />
        <circle cx="0" cy="0" r="1" fill="#7ae0ff" />
      </g>
    </svg>
  );
}

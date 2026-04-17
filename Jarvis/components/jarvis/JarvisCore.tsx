"use client";

import { memo, useMemo } from "react";
import styles from "./jarvis.module.css";

export interface JarvisCoreProps {
  /** Amplitude 0..1 — usually the assistant's analysed audio volume. */
  volume: number;
  /** Whether the assistant is currently speaking (boosts motion). */
  isSpeaking: boolean;
  /** User mic volume 0..1 — mixed in when the assistant is idle. */
  userVolume?: number;
}

/**
 * Cinematic HUD visualisation: 5 concentric SVG rings with tick marks,
 * arc segments and a central glowing orb that reacts to audio amplitude.
 *
 * Rotation speed is driven by CSS custom property `--jarvis-speed-mult`;
 * orb scale via `--jarvis-orb-scale`. Both are set inline from the `volume`
 * prop so the animation tracks audio in real time.
 */
function JarvisCoreImpl({
  volume,
  isSpeaking,
  userVolume = 0,
}: JarvisCoreProps) {
  const amp = isSpeaking ? Math.max(volume, userVolume * 0.5) : userVolume;

  const baseScale = 0.92;
  const kick = isSpeaking ? 0.5 : 0.28;
  const orbScale = baseScale + amp * kick;

  const speedMult = 1 + amp * (isSpeaking ? 4.8 : 1.8);

  const outerTicks = useMemo(() => {
    const arr: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    for (let i = 0; i < 72; i++) {
      const angle = (i * 360) / 72;
      const major = i % 6 === 0;
      const len = major ? 16 : 6;
      const rad = (angle * Math.PI) / 180;
      const r1 = 400;
      const r2 = 400 + len;
      arr.push({
        x1: Math.cos(rad) * r1,
        y1: Math.sin(rad) * r1,
        x2: Math.cos(rad) * r2,
        y2: Math.sin(rad) * r2,
        major,
      });
    }
    return arr;
  }, []);

  const innerTicks = useMemo(() => {
    const arr: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i * 360) / 16;
      const rad = (angle * Math.PI) / 180;
      arr.push({
        x1: Math.cos(rad) * 196,
        y1: Math.sin(rad) * 196,
        x2: Math.cos(rad) * 208,
        y2: Math.sin(rad) * 208,
      });
    }
    return arr;
  }, []);

  const coreStyle = {
    ["--jarvis-speed-mult" as string]: speedMult.toFixed(2),
    ["--jarvis-orb-scale" as string]: orbScale.toFixed(3),
  } as React.CSSProperties;

  return (
    <div className={styles.core} style={coreStyle} aria-hidden="true">
      <svg
        viewBox="-500 -500 1000 1000"
        className={styles.coreSvg}
        role="presentation"
      >
        <defs>
          <radialGradient id="jarvisRingGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop
              offset="100%"
              stopColor="var(--jarvis-accent)"
              stopOpacity="0.08"
            />
          </radialGradient>
          <filter id="jarvisBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle r={480} fill="url(#jarvisRingGlow)" />

        {/* OUTER RING */}
        <g
          className={`${styles.rot} ${styles.ringOuter}`}
          filter="url(#jarvisBloom)"
        >
          <circle
            className={`${styles.line} ${styles.lineSoft}`}
            r={460}
            strokeWidth={1}
          />
          <circle
            className={`${styles.line} ${styles.lineDim}`}
            r={446}
            strokeWidth={0.6}
            strokeDasharray="1 6"
          />
          <g className={styles.line} strokeWidth={1.2}>
            <line x1={460} y1={0} x2={478} y2={0} />
            <line x1={-460} y1={0} x2={-478} y2={0} />
            <line x1={0} y1={460} x2={0} y2={478} />
            <line x1={0} y1={-460} x2={0} y2={-478} />
          </g>
          <g className={styles.line} strokeWidth={1} fill="none">
            <path d="M 320 -320 L 340 -340 L 360 -340" />
            <path d="M -320 -320 L -340 -340 L -360 -340" />
            <path d="M 320 320 L 340 340 L 360 340" />
            <path d="M -320 320 L -340 340 L -360 340" />
          </g>
        </g>

        {/* TICK RING */}
        <g className={`${styles.rot} ${styles.ringTicks}`}>
          <circle
            className={`${styles.line} ${styles.lineDim}`}
            r={400}
            strokeWidth={0.5}
          />
          <g className={styles.line} strokeWidth={1}>
            {outerTicks.map((t, i) => (
              <line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                strokeOpacity={t.major ? 0.85 : 0.35}
              />
            ))}
          </g>
        </g>

        {/* ARC SEGMENT RING */}
        <g
          className={`${styles.rot} ${styles.ringArcs}`}
          filter="url(#jarvisBloom)"
        >
          <path
            className={styles.line}
            strokeWidth={1.8}
            d="M 340,0 A 340,340 0 0 1 240.4,240.4"
          />
          <path
            className={styles.line}
            strokeWidth={1.8}
            d="M 0,340 A 340,340 0 0 1 -240.4,240.4"
          />
          <path
            className={styles.line}
            strokeWidth={1.8}
            d="M -340,0 A 340,340 0 0 1 -240.4,-240.4"
          />
          <path
            className={styles.line}
            strokeWidth={1.8}
            d="M 0,-340 A 340,340 0 0 1 240.4,-240.4"
          />
          <g className={styles.fillCy}>
            <circle cx={340} cy={0} r={4} />
            <circle cx={0} cy={340} r={4} />
            <circle cx={-340} cy={0} r={4} />
            <circle cx={0} cy={-340} r={4} />
          </g>
        </g>

        {/* DASHED MID RING */}
        <g className={`${styles.rot} ${styles.ringSegs}`}>
          <circle
            className={`${styles.line} ${styles.lineSoft}`}
            r={280}
            strokeWidth={0.8}
            strokeDasharray="3 10"
          />
          <path
            className={styles.line}
            strokeWidth={2}
            fill="none"
            d="M 260,-40 A 263,263 0 0 1 260,40"
            filter="url(#jarvisBloom)"
          />
        </g>

        {/* INNER RING */}
        <g className={`${styles.rot} ${styles.ringInner}`}>
          <circle
            className={`${styles.line} ${styles.lineSoft}`}
            r={210}
            strokeWidth={1}
          />
          <circle
            className={`${styles.line} ${styles.lineDim}`}
            r={196}
            strokeWidth={0.5}
            strokeDasharray="1 4"
          />
          <g className={styles.line} strokeWidth={1}>
            {innerTicks.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
            ))}
          </g>
        </g>

        {/* Centre crosshair (static) */}
        <g className={`${styles.line} ${styles.lineDim}`} strokeWidth={0.6}>
          <line x1={-180} y1={0} x2={-150} y2={0} />
          <line x1={150} y1={0} x2={180} y2={0} />
          <line x1={0} y1={-180} x2={0} y2={-150} />
          <line x1={0} y1={150} x2={0} y2={180} />
        </g>
      </svg>

      <div className={styles.orb}>
        <div className={styles.orbCore} />
        <div className={styles.orbInner} />
      </div>

      <div className={styles.coreCorners}>
        <span className={`${styles.corner} ${styles.cornerTL}`} />
        <span className={`${styles.corner} ${styles.cornerTR}`} />
        <span className={`${styles.corner} ${styles.cornerBL}`} />
        <span className={`${styles.corner} ${styles.cornerBR}`} />
      </div>
    </div>
  );
}

export const JarvisCore = memo(JarvisCoreImpl);

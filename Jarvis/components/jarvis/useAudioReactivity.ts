"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  isCallActive: boolean;
  /** Audio element selector (Vapi renders remote tracks as <audio> tags). */
  selector?: string;
  /** 0..1 smoothing factor, higher = snappier, lower = silkier. */
  smoothing?: number;
}

/**
 * Locates Vapi's audio output element(s) after a call starts and pipes them
 * through a Web Audio AnalyserNode. Returns a smoothed, normalised volume
 * value (0..1) updated on `requestAnimationFrame` tick — perfect for driving
 * reactive visualisations.
 *
 * Cleans up AudioContext + rAF loop when `isCallActive` flips to false.
 */
export function useAudioReactivity({
  isCallActive,
  selector = "audio",
  smoothing = 0.22,
}: Options): number {
  const [volume, setVolume] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothRef = useRef(0);
  const seenRef = useRef<WeakSet<HTMLAudioElement>>(new WeakSet());

  useEffect(() => {
    if (!isCallActive) return;
    if (typeof window === "undefined") return;

    const Ctor =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return;

    let cancelled = false;
    let tapInterval: ReturnType<typeof setInterval> | null = null;

    const ctx = new Ctor();
    ctxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    const resumeIfNeeded = async () => {
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }
    };
    void resumeIfNeeded();

    const tryTap = () => {
      const els = document.querySelectorAll<HTMLAudioElement>(selector);
      els.forEach((el) => {
        if (seenRef.current.has(el)) return;
        seenRef.current.add(el);
        try {
          const stream = (el as HTMLAudioElement & { srcObject?: unknown })
            .srcObject;
          let src: AudioNode | null = null;
          if (stream instanceof MediaStream) {
            src = ctx.createMediaStreamSource(stream);
          } else if (el.src) {
            src = ctx.createMediaElementSource(el);
            // Must re-route to destination or audio would be silenced
            src.connect(ctx.destination);
          }
          if (src) src.connect(analyser);
        } catch {
          // Audio element may already be connected to another graph —
          // nothing to do, it's already marked seen so we won't retry.
        }
      });
    };

    tryTap();
    tapInterval = setInterval(tryTap, 500);

    const tick = () => {
      if (cancelled) return;
      const a = analyserRef.current;
      const d = dataRef.current;
      if (a && d) {
        a.getByteFrequencyData(d);
        let sum = 0;
        for (let i = 0; i < d.length; i++) sum += d[i];
        const avg = sum / d.length / 255;
        smoothRef.current += (avg - smoothRef.current) * smoothing;
        setVolume(smoothRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (tapInterval) clearInterval(tapInterval);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try {
        analyserRef.current?.disconnect();
      } catch {
        /* ignore */
      }
      try {
        void ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      analyserRef.current = null;
      ctxRef.current = null;
      dataRef.current = null;
      smoothRef.current = 0;
      seenRef.current = new WeakSet();
      setVolume(0);
    };
  }, [isCallActive, selector, smoothing]);

  return volume;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { JarvisCore } from "./JarvisCore";
import styles from "./jarvis.module.css";
import type { VapiStatus } from "./useVapi";

export interface JarvisOverlayProps {
  open: boolean;
  onClose: () => void;
  status: VapiStatus;
  isAssistantSpeaking: boolean;
  userVolume: number;
  assistantVolume: number;
  showMute?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  /** CSS class added to the overlay root (e.g. theme class). */
  themeClassName?: string;
  returnFocusTo?: HTMLElement | null;
}

const STATUS_COPY: Record<VapiStatus, { label: string; sub: string }> = {
  idle: { label: "STANDBY", sub: "Awaiting link · Hold steady" },
  connecting: { label: "CONNECTING", sub: "Establishing secure channel" },
  listening: { label: "LISTENING", sub: "Go ahead · I'm listening" },
  speaking: { label: "SPEAKING", sub: "JARVIS is responding" },
  error: { label: "ERROR", sub: "Connection interrupted" },
};

export function JarvisOverlay({
  open,
  onClose,
  status,
  isAssistantSpeaking,
  userVolume,
  assistantVolume,
  showMute = false,
  muted = false,
  onToggleMute,
  themeClassName = "",
  returnFocusTo,
}: JarvisOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const disconnectRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Mount guard — only create portal on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management: trap focus on disconnect, restore on close
  useEffect(() => {
    if (!open) return;
    const prevActive =
      (document.activeElement as HTMLElement | null) ?? null;
    // Defer to allow overlay to mount
    const t = window.setTimeout(() => disconnectRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // Trap: we only expose the disconnect + optional mute button.
        e.preventDefault();
        const root = overlayRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>("button, [tabindex]:not([tabindex='-1'])")
        );
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey
          ? focusables[(idx - 1 + focusables.length) % focusables.length]
          : focusables[(idx + 1) % focusables.length];
        next?.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const target = returnFocusTo ?? prevActive;
      // Only restore if that element is still in the DOM and focusable
      if (target && typeof target.focus === "function") {
        target.focus();
      }
    };
  }, [open, onClose, returnFocusTo]);

  if (!mounted) return null;

  const copy = STATUS_COPY[status];
  const barLevel = Math.min(
    1,
    (isAssistantSpeaking ? assistantVolume : userVolume) * 1.4
  );

  const overlay = (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${open ? styles.overlayOpen : ""} ${themeClassName}`}
      role="dialog"
      aria-modal="true"
      aria-label="JARVIS voice assistant active"
      aria-hidden={!open}
    >
      <header className={styles.ovHeader}>
        <div>
          <span className={styles.ovStatusDot} />
          CONNECTION · ENCRYPTED
        </div>
        <div className={styles.ovBrand}>J · A · R · V · I · S</div>
        <div aria-hidden="true">v3.2</div>
      </header>

      <section className={styles.ovMain}>
        <JarvisCore
          volume={assistantVolume}
          isSpeaking={isAssistantSpeaking}
          userVolume={userVolume}
        />

        <div className={styles.status}>
          <div className={styles.statusLabel} aria-live="polite">
            {copy.label}
          </div>
          <div className={styles.statusBar}>
            <div
              className={styles.statusBarFill}
              style={{ width: `${(barLevel * 100).toFixed(1)}%` }}
            />
          </div>
          <div className={styles.statusSub}>{copy.sub}</div>
        </div>
      </section>

      <footer className={styles.ovFooter}>
        {showMute && onToggleMute && (
          <button
            type="button"
            className={`${styles.muteBtn} ${muted ? styles.muteBtnOn : ""}`}
            onClick={onToggleMute}
            aria-pressed={muted}
          >
            {muted ? "Muted" : "Mute"}
          </button>
        )}
        <button
          ref={disconnectRef}
          type="button"
          className={styles.disconnect}
          onClick={onClose}
          aria-label="End call"
        >
          <span className={styles.disconnectBox}>
            <svg
              className={styles.powerIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span>Disconnect</span>
          </span>
        </button>
      </footer>
    </div>
  );

  return createPortal(overlay, document.body);
}

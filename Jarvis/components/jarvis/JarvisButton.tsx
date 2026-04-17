"use client";

import { useCallback, useRef, useState } from "react";
import { JarvisOverlay } from "./JarvisOverlay";
import { useAudioReactivity } from "./useAudioReactivity";
import { useVapi } from "./useVapi";
import styles from "./jarvis.module.css";

export type JarvisVariant = "default" | "minimal" | "icon-only";
export type JarvisPosition =
  | "inline"
  | "fixed-bottom-right"
  | "fixed-bottom-left";
export type JarvisTheme = "cyan" | "amber" | "red";

export interface JarvisButtonProps {
  publicKey: string;
  assistantId: string;
  label?: string;
  variant?: JarvisVariant;
  position?: JarvisPosition;
  theme?: JarvisTheme;
  showMute?: boolean;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onError?: (err: unknown) => void;
  className?: string;
}

const ThemeClass: Record<JarvisTheme, string> = {
  cyan: "",
  amber: styles.themeAmber,
  red: styles.themeRed,
};

const PositionClass: Record<JarvisPosition, string> = {
  inline: styles.inline,
  "fixed-bottom-right": styles.fixedBR,
  "fixed-bottom-left": styles.fixedBL,
};

const VariantClass: Record<JarvisVariant, string> = {
  default: "",
  minimal: styles.variantMinimal,
  "icon-only": styles.variantIcon,
};

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

/**
 * Drop-in voice assistant trigger. Encapsulates the whole Vapi + HUD
 * experience — place one of these anywhere and configure via env vars.
 */
export function JarvisButton({
  publicKey,
  assistantId,
  label = "Talk to JARVIS",
  variant = "default",
  position = "inline",
  theme = "cyan",
  showMute = false,
  onCallStart,
  onCallEnd,
  onError,
  className = "",
}: JarvisButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [muted, setMutedState] = useState(false);

  const {
    isCallActive,
    isAssistantSpeaking,
    userVolume,
    status,
    error,
    startCall,
    endCall,
    setMuted,
  } = useVapi({
    publicKey,
    assistantId,
    onCallStart,
    onCallEnd,
    onError,
  });

  const assistantVolume = useAudioReactivity({ isCallActive });

  const handleClick = useCallback(() => {
    if (isCallActive) return;
    void startCall();
  }, [isCallActive, startCall]);

  const handleToggleMute = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, [setMuted]);

  const isIconOnly = variant === "icon-only";
  const isConnecting = status === "connecting";

  const themeClass = ThemeClass[theme];
  const positionClass = PositionClass[position];
  const variantClass = VariantClass[variant];

  return (
    <div className={`${styles.root} ${themeClass} ${positionClass} ${className}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.button} ${variantClass}`.trim()}
        onClick={handleClick}
        disabled={isConnecting || isCallActive}
        aria-label={isIconOnly ? label : undefined}
      >
        <span className={styles.buttonInner}>
          {isIconOnly ? (
            <MicIcon className={styles.iconMic} />
          ) : (
            <>
              <span className={styles.buttonDot} aria-hidden="true" />
              <span>{isConnecting ? "Connecting…" : label}</span>
            </>
          )}
        </span>
      </button>

      {error && !isCallActive && (
        <span className={styles.errorMsg} role="alert">
          {error}
        </span>
      )}

      <JarvisOverlay
        open={isCallActive}
        onClose={endCall}
        status={status}
        isAssistantSpeaking={isAssistantSpeaking}
        userVolume={userVolume}
        assistantVolume={assistantVolume}
        showMute={showMute}
        muted={muted}
        onToggleMute={handleToggleMute}
        themeClassName={`${styles.root} ${themeClass}`.trim()}
        returnFocusTo={buttonRef.current}
      />
    </div>
  );
}

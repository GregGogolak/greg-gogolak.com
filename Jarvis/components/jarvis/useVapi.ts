"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VapiStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export interface UseVapiOptions {
  publicKey: string;
  assistantId: string;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onError?: (err: unknown) => void;
  onMessage?: (msg: unknown) => void;
}

export interface UseVapiReturn {
  isCallActive: boolean;
  isAssistantSpeaking: boolean;
  userVolume: number;
  status: VapiStatus;
  error: string | null;
  startCall: () => Promise<void>;
  endCall: () => void;
  setMuted: (muted: boolean) => void;
}

type VapiLike = {
  start: (assistantId: string) => Promise<unknown>;
  stop: () => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  setMuted?: (muted: boolean) => void;
};

/**
 * Lazy-initialised Vapi wrapper. The SDK is imported dynamically on first
 * `startCall()` so this hook is safe to use in SSR-rendered components.
 */
export function useVapi(options: UseVapiOptions): UseVapiReturn {
  const { publicKey, assistantId } = options;

  const vapiRef = useRef<VapiLike | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [status, setStatus] = useState<VapiStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Keep latest callbacks in a ref so event handlers always see fresh ones
  const cbRef = useRef(options);
  useEffect(() => {
    cbRef.current = options;
  }, [options]);

  const ensureVapi = useCallback(async (): Promise<VapiLike> => {
    if (vapiRef.current) return vapiRef.current;
    if (typeof window === "undefined") {
      throw new Error("Vapi can only be initialised in the browser");
    }

    const mod = await import("@vapi-ai/web");
    const anyMod = mod as unknown as Record<string, unknown>;
    const candidate =
      (anyMod.default && typeof anyMod.default === "function" && anyMod.default) ||
      ((anyMod.default as Record<string, unknown> | undefined)?.default) ||
      anyMod.Vapi ||
      (typeof mod === "function" ? mod : null);

    if (typeof candidate !== "function") {
      throw new Error("Vapi SDK did not expose a constructor");
    }

    const VapiCtor = candidate as new (key: string) => VapiLike;
    const instance = new VapiCtor(publicKey);

    instance.on("call-start", () => {
      setIsCallActive(true);
      setStatus("listening");
      setError(null);
      cbRef.current.onCallStart?.();
    });

    instance.on("call-end", () => {
      setIsCallActive(false);
      setIsAssistantSpeaking(false);
      setUserVolume(0);
      setStatus("idle");
      cbRef.current.onCallEnd?.();
    });

    instance.on("speech-start", () => {
      setIsAssistantSpeaking(true);
      setStatus("speaking");
    });

    instance.on("speech-end", () => {
      setIsAssistantSpeaking(false);
      setStatus("listening");
    });

    instance.on("volume-level", ((...args: unknown[]) => {
      const v = typeof args[0] === "number" ? args[0] : 0;
      setUserVolume(Math.max(0, Math.min(1, v)));
    }) as (...args: unknown[]) => void);

    instance.on("error", ((...args: unknown[]) => {
      const err = args[0];
      const anyErr = err as { errorMsg?: string; message?: string } | undefined;
      console.error("[Vapi] error", err);
      setStatus("error");
      setError(anyErr?.errorMsg || anyErr?.message || "Unknown Vapi error");
      cbRef.current.onError?.(err);
    }) as (...args: unknown[]) => void);

    instance.on("message", ((...args: unknown[]) => {
      cbRef.current.onMessage?.(args[0]);
    }) as (...args: unknown[]) => void);

    vapiRef.current = instance;
    return instance;
  }, [publicKey]);

  const startCall = useCallback(async () => {
    try {
      setStatus("connecting");
      setError(null);
      const v = await ensureVapi();
      // Surface a friendly error if mic is denied before Vapi tries it
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await v.start(assistantId);
    } catch (err) {
      console.error("[Vapi] startCall failed", err);
      const anyErr = err as { name?: string; message?: string };
      const msg =
        anyErr?.name === "NotAllowedError" || anyErr?.name === "SecurityError"
          ? "Microphone permission denied"
          : anyErr?.message || "Failed to start call";
      setStatus("error");
      setError(msg);
      cbRef.current.onError?.(err);
    }
  }, [ensureVapi, assistantId]);

  const endCall = useCallback(() => {
    try {
      vapiRef.current?.stop();
    } catch (err) {
      console.warn("[Vapi] stop error", err);
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    try {
      vapiRef.current?.setMuted?.(muted);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        vapiRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return {
    isCallActive,
    isAssistantSpeaking,
    userVolume,
    status,
    error,
    startCall,
    endCall,
    setMuted,
  };
}

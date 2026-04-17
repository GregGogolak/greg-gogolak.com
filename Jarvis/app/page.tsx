import Link from "next/link";
import { JarvisButton } from "@/components/jarvis";

export default function HomePage() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "clamp(24px, 5vw, 64px)",
        background:
          "radial-gradient(ellipse 80% 55% at 50% 50%, rgba(0,130,180,0.22), transparent 60%), radial-gradient(ellipse 120% 80% at 50% 110%, rgba(0,60,100,0.18), transparent 70%), #000308",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(0,212,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,212,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 70% 65% at 50% 50%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 65% at 50% 50%, black, transparent 80%)",
          pointerEvents: "none",
        }}
      />

      <section
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
          textAlign: "center",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontFamily: "Share Tech Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.5em",
            color: "#00d4ff",
            textTransform: "uppercase",
          }}
        >
          Stark Industries · Secure Link
        </p>

        <h1
          style={{
            fontSize: "clamp(44px, 10vw, 140px)",
            fontWeight: 300,
            letterSpacing: "clamp(0.08em, 1.2vw, 0.18em)",
            lineHeight: 1,
            textShadow:
              "0 0 20px rgba(0,212,255,0.45), 0 0 60px rgba(0,212,255,0.18), 0 0 120px rgba(0,212,255,0.08)",
          }}
        >
          J.A.R.V.I.S.
        </h1>

        <p
          style={{
            fontFamily: "Share Tech Mono, monospace",
            fontSize: "clamp(12px, 1.4vw, 15px)",
            letterSpacing: "0.32em",
            color: "rgba(207,239,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          Just A Rather Very Intelligent System
        </p>

        <JarvisButton
          publicKey={publicKey}
          assistantId={assistantId}
          variant="default"
          position="inline"
          theme="cyan"
          label="Talk to JARVIS"
        />

        <Link
          href="/demo"
          style={{
            fontFamily: "Share Tech Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.4em",
            color: "rgba(207,239,255,0.45)",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(0,212,255,0.25)",
            paddingBottom: 3,
          }}
        >
          → View component variants
        </Link>
      </section>
    </main>
  );
}

"use client";

import { JarvisButton } from "@/components/jarvis";

/**
 * Demo page — verifies all three variants, three positions and three themes
 * work correctly. Drop into any Next.js App Router project at /app/demo/page.tsx
 * and visit /demo.
 *
 * You'll need the Vapi env vars set in .env.local:
 *   NEXT_PUBLIC_VAPI_PUBLIC_KEY=...
 *   NEXT_PUBLIC_VAPI_ASSISTANT_ID=...
 */
export default function DemoPage() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(0,130,180,0.18), transparent 60%), #000308",
        color: "#cfefff",
        fontFamily:
          'Orbitron, ui-sans-serif, system-ui, -apple-system, sans-serif',
        padding: "clamp(24px, 5vw, 72px)",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 64 }}>
        <p
          style={{
            fontFamily: "Share Tech Mono, monospace",
            letterSpacing: "0.5em",
            fontSize: 11,
            color: "#00d4ff",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Drop-in Component · Demo
        </p>
        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 64px)",
            fontWeight: 300,
            letterSpacing: "0.18em",
            margin: 0,
            textShadow: "0 0 24px rgba(0,212,255,0.4)",
          }}
        >
          J.A.R.V.I.S.
        </h1>
        <p
          style={{
            marginTop: 16,
            fontFamily: "Share Tech Mono, monospace",
            fontSize: 13,
            letterSpacing: "0.3em",
            color: "rgba(207,239,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          Variants · Positions · Themes
        </p>
      </header>

      {(!publicKey || !assistantId) && (
        <div
          role="alert"
          style={{
            maxWidth: 640,
            margin: "0 auto 48px",
            padding: "16px 20px",
            border: "1px solid rgba(255,59,74,0.5)",
            background: "rgba(255,59,74,0.08)",
            color: "#ffd5dc",
            fontFamily: "Share Tech Mono, monospace",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            clipPath:
              "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
          }}
        >
          ⚠ Missing env vars — set{" "}
          <b>NEXT_PUBLIC_VAPI_PUBLIC_KEY</b> and{" "}
          <b>NEXT_PUBLIC_VAPI_ASSISTANT_ID</b> in <code>.env.local</code> before
          clicking a button.
        </div>
      )}

      <section style={grid}>
        <DemoCard title="Default · Cyan">
          <JarvisButton
            publicKey={publicKey}
            assistantId={assistantId}
            variant="default"
            theme="cyan"
          />
        </DemoCard>

        <DemoCard title="Minimal · Amber">
          <JarvisButton
            publicKey={publicKey}
            assistantId={assistantId}
            variant="minimal"
            theme="amber"
            label="Summon JARVIS"
          />
        </DemoCard>

        <DemoCard title="Icon-only · Red">
          <JarvisButton
            publicKey={publicKey}
            assistantId={assistantId}
            variant="icon-only"
            theme="red"
            label="Open voice assistant"
          />
        </DemoCard>

        <DemoCard title="With mute toggle">
          <JarvisButton
            publicKey={publicKey}
            assistantId={assistantId}
            variant="default"
            theme="cyan"
            showMute
            label="Secure Link"
          />
        </DemoCard>

        <DemoCard title="Callback logging">
          <JarvisButton
            publicKey={publicKey}
            assistantId={assistantId}
            variant="minimal"
            theme="cyan"
            label="Start session"
            onCallStart={() => console.log("[demo] call-start")}
            onCallEnd={() => console.log("[demo] call-end")}
            onError={(e) => console.warn("[demo] error", e)}
          />
        </DemoCard>

        <DemoCard title="Custom themed via CSS var">
          <div style={{ ["--jarvis-accent" as string]: "#9b5cff", ["--jarvis-accent-rgb" as string]: "155, 92, 255" } as React.CSSProperties}>
            <JarvisButton
              publicKey={publicKey}
              assistantId={assistantId}
              variant="default"
              label="Purple Mode"
            />
          </div>
        </DemoCard>
      </section>

      <p
        style={{
          marginTop: 80,
          textAlign: "center",
          fontFamily: "Share Tech Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.3em",
          color: "rgba(207,239,255,0.4)",
          textTransform: "uppercase",
        }}
      >
        ↓ A fixed FAB is mounted below for position testing ↓
      </p>

      {/* Floating action button pinned to viewport — verifies portal + position */}
      <JarvisButton
        publicKey={publicKey}
        assistantId={assistantId}
        variant="icon-only"
        position="fixed-bottom-right"
        theme="cyan"
        label="Open JARVIS"
      />
    </main>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 28,
  maxWidth: 1200,
  margin: "0 auto",
};

function DemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "40px 28px",
        border: "1px solid rgba(0,212,255,0.18)",
        background:
          "linear-gradient(180deg, rgba(0,212,255,0.03), rgba(0,212,255,0.01))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        clipPath:
          "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
      }}
    >
      <p
        style={{
          fontFamily: "Share Tech Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.35em",
          color: "rgba(207,239,255,0.45)",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

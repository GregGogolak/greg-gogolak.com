"use client";
import Glob from "./Glob";
import HUDOverlay from "./HUDOverlay";

export default function VoiceOrb({ volume, userVolume, isSpeaking, isListening, status, bootPhase, telemetry }) {
  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        width:         "100vw",
        height:        "100vh",
        pointerEvents: "none",
        zIndex:        0,
      }}
    >
      {/* The 3D WebGL orb — fills viewport */}
      <Glob volume={volume} userVolume={userVolume} status={status} bootPhase={bootPhase} />

      {/* HUD chrome overlay */}
      <HUDOverlay status={status} bootPhase={bootPhase} telemetry={telemetry} />
    </div>
  );
}

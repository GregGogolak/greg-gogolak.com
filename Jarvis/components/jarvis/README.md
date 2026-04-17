# JARVIS Voice Assistant Button

A cinematic, drop-in voice assistant component for Next.js. Wraps the Vapi Web
SDK, a reactive HUD overlay, and Web Audio-driven animation into a single
`<JarvisButton />`.

## Installation

```bash
npm install @vapi-ai/web
```

Add your Vapi credentials to `.env.local`:

```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

Copy the `components/jarvis/` folder into your project. No other config needed —
the component ships with its own scoped CSS module and works with or without
Tailwind.

## Usage

```tsx
"use client";
import { JarvisButton } from "@/components/jarvis";

export default function Page() {
  return (
    <JarvisButton
      publicKey={process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!}
      assistantId={process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!}
      position="fixed-bottom-right"
    />
  );
}
```

That's it. Click the button, grant microphone permission when prompted, and
the full-screen overlay with the reactive JARVIS core will take over until you
hit Disconnect (or press `Escape`).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `publicKey` | `string` | **required** | Vapi public key |
| `assistantId` | `string` | **required** | Vapi assistant ID |
| `label` | `string` | `"Talk to JARVIS"` | Button text / aria-label |
| `variant` | `"default" \| "minimal" \| "icon-only"` | `"default"` | Button style |
| `position` | `"inline" \| "fixed-bottom-right" \| "fixed-bottom-left"` | `"inline"` | Placement mode |
| `theme` | `"cyan" \| "amber" \| "red"` | `"cyan"` | Accent colour |
| `showMute` | `boolean` | `false` | Show a mute toggle in the overlay |
| `onCallStart` | `() => void` | — | Fires when call connects |
| `onCallEnd` | `() => void` | — | Fires when call ends |
| `onError` | `(err: unknown) => void` | — | Fires on any Vapi error |
| `className` | `string` | `""` | Extra class on the root wrapper |

## App Router vs Pages Router

The component is marked `"use client"` and is fully compatible with both
routers. All `window`/`document`/`AudioContext` access is guarded behind effects
so the component is safe to render inside server components.

## Theming

Override the accent colour directly with CSS variables if the built-in themes
don't match your brand:

```css
.my-wrapper {
  --jarvis-accent: #9b5cff;
  --jarvis-accent-rgb: 155, 92, 255;
}
```

```tsx
<JarvisButton ... className="my-wrapper" />
```

## Browser autoplay policy

Microphone access requires a user gesture, which the button click satisfies
naturally. If permission is denied, the component shows a friendly inline
message under the button and the user can retry on click.

## Advanced: use the hooks directly

If you want to build a custom UI around the Vapi lifecycle, the hooks are
exported too:

```tsx
import { useVapi, useAudioReactivity } from "@/components/jarvis";

const { isCallActive, status, startCall, endCall } = useVapi({
  publicKey: "...",
  assistantId: "...",
});
const volume = useAudioReactivity({ isCallActive });
```

## Notes

- The Vapi SDK is imported dynamically inside `useVapi`, so it is never pulled
  into the server bundle.
- The overlay is rendered via `React.createPortal` to `document.body`, so it
  always covers the viewport regardless of where the button is placed.
- Body scroll is locked while the overlay is open; focus is trapped on the
  Disconnect button and restored to the trigger on close.
- Ending the call cleanly tears down the AudioContext, the rAF loop, and all
  event listeners.

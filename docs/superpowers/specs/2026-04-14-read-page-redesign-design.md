# Read Page Redesign — Design Spec
**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

Redesign the Give Me A Read page (`app/read/page.jsx`) to add persistent conversation history via tabs and improve the output section with colour-coded left-border accent cards.

---

## UI Layout

### Tab Strip
- Horizontal scrollable pill tabs, pinned at the top of the page
- Each tab labelled: `ACTION HH:MM` (e.g. `BUY 9:34`, `WAIT 11:02`)
- Up to 5 tabs displayed (oldest auto-drops when a 6th is added)
- Most recent read is leftmost and selected by default on load
- Active tab border and text colour matches the action:
  - `BUY` → emerald green (`#059669` / `#34d399`)
  - `WAIT` → amber (`#ca8a04` / `#f59e0b`)
  - `HOLD` → blue (`#1d4ed8` / `#60a5fa`)
  - `AVOID` → red (`#dc2626` / `#f87171`)
- Inactive tabs: dim gray border, dim gray text
- Last slot is always `+ NEW READ` (triggers a fresh analysis POST)
- While a new read is generating, the `+ NEW READ` tab becomes `ANALYSING…` (blue tint)

### Output Sections
Four stacked cards with a 3px left accent border, rendered for whichever tab is active:

| # | Section | Left border colour | Answer colour |
|---|---|---|---|
| 1 | UNDERVALUED? | Green if Yes, Red if No | Green (Yes) / Red (No) |
| 2 | WHY AT THIS LEVEL? | Yellow (always) | N/A — prose only |
| 3 | WHAT RESOLVES IT? | Blue (always) | N/A — bullet list |
| 4 | RECOMMENDED ACTION | Action colour (BUY/WAIT/HOLD/AVOID) | Matching action colour, larger text, subtle background tint |

### Market Pulse
- Rendered below the 4 sections
- Collapsed by default: two inline chips side by side — `RETAIL` and `HEDGE FUND`, showing the label only
- Tapping either chip expands in-place to show full label + summary paragraph
- No popup/modal — collapses/expands inline within the same card

### Loading State
- While `ANALYSING…` is active, four shimmer skeleton cards replace the output sections
- Prevents blank-screen flash

### Cache / Age Line
- One line between tabs and sections: `fresh read` or `HH:MMam · Xh ago` for cached reads
- Dim gray, monospace, centred

---

## Data Layer

### Redis Keys

| Key | Type | Content |
|---|---|---|
| `analysis:latest` | Hash | Most recent result — unchanged, used by dashboard sentiment chip |
| `analysis:history` | List | Up to 5 full analysis results, newest at index 0 |

### API Changes (`app/api/analysis/route.js`)

**GET** — now returns the full history list:
```js
LRANGE analysis:history 0 4
// Returns array of up to 5 results, newest first
// Falls back to [] if key doesn't exist
```
The read page calls GET on mount and populates all tabs from this array.

**POST** — after generating a fresh result, writes to both keys:
```js
LPUSH analysis:history <result>
LTRIM analysis:history 0 4   // keep exactly 5
SET   analysis:latest <result>  // unchanged behaviour
```

No other API routes are changed.

---

## Component Architecture

### Files changed
- `app/read/page.jsx` — full redesign
- `app/api/analysis/route.js` — GET returns history, POST writes to history

### Files unchanged
- All other API routes
- Dashboard components
- Hooks
- `lib/` utilities

### State in `app/read/page.jsx`
```js
const [history, setHistory]     = useState([])   // array of up to 5 results
const [activeIdx, setActiveIdx] = useState(0)     // which tab is selected
const [loading, setLoading]     = useState(false)
const [error, setError]         = useState(null)
const [pulseOpen, setPulseOpen] = useState(false) // resets when tab changes
```

On mount: fetch GET `/api/analysis` → set `history`.  
On `+ NEW READ`: POST `/api/analysis` → prepend result to `history`, set `activeIdx` to 0, reset `pulseOpen`.  
Switching tabs: set `activeIdx`, reset `pulseOpen`.

---

## Edge Cases

- **No history yet** (first ever load): show only the `+ NEW READ` tab, no output sections
- **Redis unavailable**: GET returns `[]`, history is empty, page still works — user can generate a read (result won't persist)
- **Tab timestamp format**: `HH:MM` in local time using `new Date(generatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: false})`
- **`whatResolvesIt` not an array**: guard with `Array.isArray()` before `.map()` (already in current code)

# NVDA Jarvis — Design System
# Built through direct ideation with the project owner. Every decision in
# this file was arrived at through a specific conversation and has a reason.
# Do not deviate from these decisions without explicit instruction.
# If something feels like it conflicts with a specific component need,
# ask before overriding. The vision here takes precedence over defaults.

---

## How To Use This File

Read this entire file before touching any UI-related file. This is not a
style guide you skim — it is the design brain of the project. When you are
about to make a visual decision and you are unsure, the answer is in here.
If it is genuinely not covered, stop and ask rather than default to
something generic.

The owner of this project has a clear and specific visual vision. Generic
dark UI, cold blue-black backgrounds, flat cards, and default component
library aesthetics are explicitly not what this project is. When in doubt,
refer back to the core philosophy section and ask whether your decision
serves that vision.

This design system was built step by step through direct conversation.
Every decision has a reason. When implementing, do not just follow the
spec — understand the reason behind it. If an implementation choice
would violate the spirit of a decision even while technically following
the letter of it, flag it and ask.

---

## The Vision In One Paragraph

This app is a demonstration of serious capability. It has a full backend —
authentication, live data APIs, AI integration, multi-user roles, a real
database. The frontend needs to match that ambition. The target feeling is
quiet sophistication — like a Rolls-Royce or a MacBook. When you look at
it from a distance it reads as restrained and simple. When you look closely
there is craft everywhere. Nothing is flashy. Nothing is loud. But nothing
is lazy either. Every pixel is placed deliberately. A potential client or
collaborator seeing this cold should feel that someone who built this for
fun is capable of much more. The design must represent the full technical
depth of what is behind it.

---

## Core Philosophy — Read This First

### 1. Depth Is The Primary Design Tool
This app does not achieve its premium feeling through colour or decoration.
It achieves it through depth. Everything exists at a different distance
from the viewer. The background is far away. Cards float in the middle
distance. Interactive elements and key data points sit closest to the
viewer. This Z-axis is not decorative — it is the fundamental organising
principle of the entire visual system. Every time you place an element,
ask: what layer does this belong to, and does its visual treatment
communicate that layer correctly?

The owner described this as elements being at different proximity to the
screen — like placing a MacBook on a table vs a piece of cardboard. The
MacBook has smooth edges, elevation, and a sense of being an object in
space. That physical quality is what every element in this app should have.

### 2. Empty Space Is Not Empty — It Breathes
The background is not just a dark colour. It is an atmosphere. It has
soft bloom and subtle gradient that makes it feel like you are looking
into a space rather than at a surface. This depth in the background is
what makes the cards in front of it feel like they are genuinely floating
rather than pasted on. Do not fill this space. Do not add texture to it.
Its emptiness — alive with bloom — is intentional and important.

Texture and detail belong on surfaces, not on the atmosphere. Bloom works
at large scale because it is diffuse and does not create detail noise.
If you add too much to the background it stops feeling like space and
starts feeling like noise. The restraint is the point.

### 3. Colour Has Meaning Or It Has No Place
This is the most violated principle in UI design. Colour in this app is
a communication tool, not decoration. Green means profit or positive
signal. Red means loss or risk. Amber means caution, worth attention.
Blue means informational, neutral context. If a colour cannot be
justified by one of those four meanings, it should not be there.

The base palette is near-black dark greys with blue-grey saturation.
Colour appears only when it is saying something specific. When someone
looks at a number in this app and it is green, they should know
immediately and without thinking that something is positive. That only
works if green is not also used for borders, hover states, decorative
elements, or anything else. Every additional use of a colour dilutes
all its other uses.

### 4. Function First, Then Feel
Animations and transitions exist to confirm that something worked and
to communicate where something came from or went to. They are never
ceremonies that make you wait. A button works the instant you press it.
The animation is the response to it working — it happens because of the
action, not before it. If an animation delays function even by 100ms,
it is wrong. Speed of function is non-negotiable. The owner was explicit:
functionality is the priority, beauty is the response to it.

### 5. Weight, Inertia, And Direction In 3D Space
Elements that live on higher Z-layers — closer to the viewer — have more
mass. They move with more deliberateness. They accelerate into movement
and decelerate out of it. They do not snap or pop. This is not about
being slow — it is about feeling physical.

Movement has direction. Things that appear come from somewhere — they
grow from the surface below them or fade in from the background. Things
that disappear go somewhere — they retreat away from the viewer or
fade back into the surface. The viewer should always be able to follow
the spatial logic of what just happened. Nothing should teleport.

The owner described it as: no blitzy colourful explosive flashy movement.
Purposeful and weighted, with direction in the 3D plane.

---

## Atmosphere and Background

### The Base
Background colour: a very dark near-black with a subtle blue-grey
chromatic quality. Not pure black (#000000) — that reads as dead and flat.
Not cold blue-black — that reads as developer tool. The target is the
quality Apple uses in their dark interfaces: near-black that has just
enough saturation to feel alive when you look at it directly but reads
as neutral at a glance.

The owner described this as the Apple technology company colour palette —
black, white, dark grey with a cloudy feeling where colour exists in
saturation, not as a theme colour splashed everywhere. Everything feels
soft but still visible. Not hidden, not flat.

Approximate base value: #0a0a0f to #0d0d14. Test against the bloom
overlays — the base just needs to be dark enough to make everything
above it float.

### The Bloom
On top of the base, a soft atmospheric bloom. Large radial gradients at
very low opacity — 8 to 15% maximum. The bloom colour is a desaturated
royal blue-indigo. Not vivid. Not the royal blue accent colour at full
saturation. Think of it as the memory of blue rather than blue itself.
You feel it more than you see it.

The bloom creates the sense that you are looking into a space, not at a
surface. It implies a light source somewhere deep in the background.
Two or three radial gradient overlays at different positions and sizes,
very low opacity. They can drift very slowly — imperceptibly second to
second, noticeable if you watch for 10 seconds. Like breathing. This
slow movement is what makes the background feel alive rather than static.

The owner confirmed this direction explicitly: visible depth through bloom
and gradient colour feel, not texture. The background has to feel like a
dark emptiness with a soft bloom — not flat, not textured, just alive.

### What The Background Must Never Have
- Texture of any kind. Texture belongs on cards.
- Hard edges or defined shapes.
- Bright or saturated colour.
- Grid lines, dot patterns, or geometric repetition.
- Any element that competes with the content floating above it.
- Too many bloom sources — more than three creates noise instead of depth.

---

## The Depth Layer System

Everything in this app exists at one of four layers. When you build any
element, you must know which layer it belongs to. The layer determines
the shadow, the background lightness, and the movement behaviour.

### Layer 0 — The Atmosphere
The background bloom and gradient. Not interactive. Never contains content
directly. Its only job is to create the sense of depth that makes
everything above it feel like it is floating.

### Layer 1 — The Base Surface
Section backgrounds and page containers. Slightly lighter than the
atmosphere. Approximate: #111118 to #13131a. Shadow: very subtle, almost
none. These surfaces are close to the background and their separation
from it is minimal.

### Layer 2 — Cards and Panels
Where data lives. Each card floats above the base surface.

Background: #17171f to #1c1c26 range.
Border: 0.5px, rgba(255,255,255,0.06) to rgba(255,255,255,0.08).
Shadow: soft and spread — 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px
rgba(0,0,0,0.3). The shadow implies separation from the surface below.
Top edge inner highlight: 0.5px or 1px on the top edge only,
rgba(255,255,255,0.06). Simulates light catching the top rim of a
physical object.

Material: matte brushed aluminium. A very fine grain texture at 2 to 4%
opacity — barely perceptible up close, invisible from a distance. Like
the surface of a MacBook lid. This texture is what gives the card material
quality and distinguishes it from the smooth atmosphere. The grain must
be fine — think satin not sandpaper. The owner confirmed: matte brushed
aluminium as the primary material, absorbs light, shows contours softly
without hard reflections.

### Layer 3 — Interactive Elements and Foreground
Buttons, active states, hero data points, the navigation pill, modals.
Closest to the viewer.

Material: smooth. No grain texture. The smoothness contrasts with the
matte texture of Layer 2 and signals that this is a different kind of
thing. A subtle satin quality is acceptable — slightly more reflective
than the cards beneath. Not glossy, not shiny. Just the difference
between matte and satin on a real surface.

The owner established the rule: gloss signals elevation. When something
is smoother or more reflective it means it is closer to the viewer.
Never reverse this — Layer 2 surfaces should never be glossier than
Layer 3 elements.

Shadow: stronger than Layer 2 — 0 12px 40px rgba(0,0,0,0.5), 0 4px
12px rgba(0,0,0,0.4).

---

## Colour System

### Base Palette
Near-black backgrounds as described above. All greys in text and borders
have a subtle blue-grey quality — not warm grey, not neutral grey, but
cool grey that matches the chromatic quality of the background. This
coherence is what makes the app feel intentional rather than assembled.

### The Four Signal Colours

**Green — Profit, Positive, Pass**
Used for: positive P&L numbers, conditions that pass, thesis intact
status, buy signals. A measured, controlled green. Not neon. Not lime.
A green that communicates confidence rather than excitement.
Approximately #22c55e tested against the dark background.
Applied as text colour of the number itself, or as a very faint tint
background at rgba opacity 8 to 12% for status backgrounds.

**Red — Loss, Negative, Risk**
Used for: negative P&L, failed conditions, broken thesis, risk signals.
Controlled, not alarming. The red communicates information, not panic.
Approximately #ef4444 softened if it reads as too aggressive.
Applied the same way as green.

**Amber/Yellow — Caution, Worth Attention**
Used for: elevated conditions not yet failures, things needing a look
without being emergencies. A warm amber, not a bright yellow. The
"have a look at this" colour. Approximately #f59e0b softened.
Applied the same way as green.

**Royal Blue — Informational, Identity, Neutral Context**
Used for: informational notifications, price movement context that is
neither good nor bad, the active navigation indicator, identity moments.
This is the app's signature colour used extremely sparingly. It is the
one colour that says "this is Jarvis." Approximately #3b82f6 but
desaturated slightly — closer to the blue-indigo of the background
bloom. Applied as a very faint tint or muted text colour rather than
solid fill. When it appears full strength it should feel like an event.

### The Faded Glow Rule
All four signal colours must feel like soft glows, not solid fills.
They are faded versions of themselves. When a number is green it should
feel like it is glowing gently, not painted. Achieved by:
- Full saturation for text colour itself
- 8 to 15% opacity for any background fill
- Never a solid full-saturation background fill
- Borders in signal colour at 20 to 30% opacity maximum

The owner was explicit: faded colours for price movements and
notifications. They need to be like a soft glow. They cannot be loud.

### Restraint Is Non-Negotiable
If you are reaching for a colour not in the four above, stop. Ask whether
the element genuinely needs colour or whether size, weight, or position
communicates it instead. The power of the four signal colours comes
entirely from how rarely other colours appear.

---

## Typography

### Fonts
**Inter** — hero numbers, body text, names, headings, anything needing
presence and readability.
Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold,
hero numbers only).

**JetBrains Mono** — all financial data in tables, price figures in
data rows, percentage values in lists, labels and metadata, anything
benefiting from monospace column alignment.
Weights: 300 (light for muted labels), 400 (regular), 500 (medium
for important data values).

This hybrid was chosen through direct comparison. Inter gives hero
numbers presence and weight. JetBrains Mono handles tables and data
rows where column alignment matters. This is what most premium Fintech
apps do — and it was the clear preference after seeing all three options.

### The Authority Scale
Authority is communicated through three tools used together: size,
weight, and colour brightness. Large + heavier weight + bright = closest
to viewer, most important. Small + light weight + muted = furthest,
supporting context. The scale is a gradient — every level should be
perceptibly different from the levels above and below it.

**Hero numbers** (fund total, live price, the single most important
figure on any screen):
- Font: Inter
- Size: 40px to 56px depending on screen
- Weight: 600
- Letter spacing: -1.5px to -2px. Tight tracking at large sizes
  feels intentional and premium.
- Colour: brightest text — approximately #f0f0f8

**Important supporting numbers** (individual trade P&L, win rate,
key metrics sharing the screen):
- Font: Inter or JetBrains Mono depending on context
- Size: 18px to 24px
- Weight: 500
- Colour: approximately #c8c8d8

**Data table values** (prices, percentages, dates in rows):
- Font: JetBrains Mono always
- Size: 12px to 14px
- Weight: 400
- Colour: approximately #8888a0

**Labels and metadata** (text explaining what a number means,
section titles, eyebrow labels):
- Font: JetBrains Mono for short technical labels. Inter for longer
  descriptive text.
- Size: 10px to 12px
- Weight: 300 to 400
- Letter spacing: 0.08em to 0.14em for short uppercase labels
- Colour: muted — approximately #484858 to #606070

### Typography Rules
Never use weight 700 or above for real content. Maximum is 600 and
only for hero numbers. Heavy weight on dark backgrounds reads as
aggressive, not premium.

Currency symbols and units (€, %, $) are styled one level quieter
than the number they belong to. The symbol is supporting context.
The number is the information. Slightly smaller or more muted on the
symbol draws the eye to the number first.

---

## Shape and Border Radius

### The Principle
Rounding communicates function and hierarchy. The owner described it as:
adding a variety of rounding allows things to have different meaning.
A card-level rounding for a bubble on the dashboard, a pill-type rounding
for a button within that bubble shows it is different. There is playfulness
in the variety but there is also a system — the rounding level tells you
what kind of thing you are looking at before you read its content.

### The Scale

**Large containers and cards** (Layer 2 elements, main data panels):
16px to 20px border radius. The owner confirmed Apple-device level —
iPhone or MacBook rounding. Clearly rounded, unmistakably intentional,
but the shape still reads as a rectangle. Not a subtle credit card, not
a pill, the clean in-between.

**Medium elements** (inner panels, secondary cards nested inside larger
ones, input fields, dropdowns):
10px to 14px border radius. Slightly less rounded than the container
they sit inside.

**Interactive elements** (buttons, tags, badges, status pills, the
navigation indicator):
20px to 9999px — approaching or fully pill shaped. Significantly
different rounding from everything else. The pill shape is the visual
shorthand for "this does something" or "this classifies something."

**Avatars and circular elements**: 50% — always perfectly circular.

### The Flush Surface Rule
Never apply rounded corners to an element that is flush against another
element on one side. If a card expands to reveal a panel below it, the
card's bottom corners go to 0px radius while open. The panel's top
corners are also 0px. Rounded corners only make visual sense on a surface
enclosed on all sides.

---

## Motion and Animation

### The Foundational Rule
Function is instant. The action happens when you press. Animations are
responses to actions. They confirm, communicate, and give weight to what
just happened. They never gate or delay the function itself.

The owner described it clearly: priority is functionality. If you press
a button it works like a button immediately. But then it can expand or
load by growth, or shrink, or slowly fade to the background or come and
hover out of the background. The animation is what happens after the
function executes, not before.

### Easing
All animations use deceleration easing. Things start moving quickly and
slow down as they arrive. This gives movement the quality of physical
inertia — like an object with momentum coming to rest naturally.

CSS value: cubic-bezier(0.16, 1, 0.3, 1) for most transitions.
Fast start, smooth settled arrival. Something sliding into place, not
snapping or bouncing.

Never use linear easing for anything visible — linear motion feels
mechanical and cheap. Never use bounce easing — this app is precise,
not playful.

### Speed Guidelines

- Micro interactions (button press, hover state): 100ms to 150ms
- Element transitions (card expanding, panel appearing): 200ms to 300ms
- Page transitions (content fade out and back in): 300ms to 500ms total
  (150 to 250ms out, 150 to 250ms back in)
- Navigation indicator sliding: 250ms to 350ms
- Number count-up on load: 800ms to 1000ms maximum. Never longer.

The owner was explicit: I do not want to be waiting to use functions.
People over-design sometimes and create a long story through everything
and it takes a long time to load in. Speed is not optional.

### The Count-Up
Key hero numbers count up from zero to their real value when data loads.
This communicates that real data just arrived. It is not a feature to
be watched — it is a signal, and it should complete in under a second.

Easing: easeOutExpo. Starts fast, decelerates sharply into the final
value. The number arrives with momentum and settles.

```js
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}
```

Duration: 800ms to 1000ms. The viewer comprehends that the number
counted up — they do not have time to read every intermediate value.

Apply to hero numbers and significant aggregated values only. Not
every number on screen.

### Hover States
When hovering, the element comes slightly toward the viewer —
translateY(-2px) to translateY(-4px) depending on the element's layer.
The shadow beneath deepens slightly. The border brightens very slightly.
This should feel like pressing lightly on a physical surface and feeling
it respond — not like a colour changing on a screen.

Transition: 200ms deceleration easing. On mouse leave: same timing back
to rest. The element settles, it does not snap back.

### Page Transitions
Content fades out, then fades back in. Not a slide, not a flip — a fade.
150ms to 200ms out. A moment of dark showing through. Then same duration
back in. The viewer always knows they moved somewhere because there was
a visible transition with a clear before and after.

### What Animations Must Never Do
- Delay function
- Run longer than specified above
- Use colour flashes, bright glows, or explosive scaling
- Stack — if something is already animating, wait for it to finish
- Move without a clear origin and destination

---

## Navigation

### The Concept
A floating pill — a contained, rounded navigation element hovering at
the top of the screen. Not a full-width bar attached to the top edge.
Its own object, floating with space around it above the content below.
It belongs to Layer 3 — closest to the viewer — and should look and
feel like it is physically in front of the page content.

The owner described it as a soft bubble hovering over the top of the
screen, not covering any text, with its own space. The highlight for the
current section moves so there is an animation of travelling from one
section to another.

### Structure
All navigation sections sit inside the pill side by side. The pill has
enough padding to contain them comfortably. It does not stretch edge to
edge — it is a contained object, not a bar.

### The Active Indicator
A smaller pill shape inside the navigation pill that sits behind the
active section label. When navigating to a different section, the
indicator slides from its current position to the new one.

The slide animation: 250ms to 350ms, deceleration easing. The indicator
moves as if it has physical weight — accelerates out of the old position,
settles into the new one. The viewer follows the movement and understands
they travelled from one section to another.

Indicator colour: royal blue at low opacity fill — approximately
rgba of the blue at 15 to 20%. Active section label brightens slightly.
Inactive labels are muted.

### Page Transition On Navigation
When a section is tapped the content fades out over 150ms to 200ms,
there is a brief moment of the background showing, then the new content
fades in over the same duration. This creates the sensation of travelling
to a different place. The owner described it as: the screen has a fade
and come back feeling so it is not just instantly clicking and you do
not even know what section you are in. Takes 0.5 to 1 second total.
Visibly goes away and comes back but is not a two-hour movie.

### Visual Treatment
The pill: Layer 3 treatment. Dark background slightly lighter than Layer
2 cards. Subtle border. Soft shadow that separates it from everything
below it. Smooth surface — no texture, as befits a Layer 3 element. The
shadow is critical — without a meaningful shadow it reads as a flat bar
rather than a floating object.

### Mobile Behaviour
Identical to desktop. Same floating pill, same sliding indicator, same
fade transition. No hamburger menu. No hidden navigation. All sections
visible and reachable in one tap at all times. On very small screens
section labels can compress to icons with labels, but the pill shape and
sliding indicator must be preserved.

### Implementation Note
This replaces the current side rail navigation entirely. The side rail
and its 90px margin-left on main content must both be removed. Main
content takes full width. The floating pill sits above it — fixed or
absolute at the top with z-index placing it on Layer 3.

---

## Login Page

### The Concept
A frosted glass island floating in the centre of a living background.
The glass card and the background exist in the same scene — the glass
is a material within the space, not a panel placed on top of a
background image. The opacity lets you sense what is behind it,
creating the floating island quality rather than a flat card feel.

The owner described it as: an island in the middle which is sort of
see-through, like a brushed glass look. And in the background something
to represent that there is depth so that this island is floating on top
of it. Since it is a trading terminal software it could have numbers in
the background or graphs in the background floating around, like a sea of
numbers and graphs covering the background but clear and subtle —
a subtle humming noise in the background, not too aggressive.

### The Background — The Financial Data Sea
Behind the glass card: floating price numbers, candlestick shapes, graph
lines, percentage values, ticker symbols. The visual language of trading
rendered quietly. Opacity: 6 to 12% for individual elements. The overall
impression is a soft humming presence — you are aware there is financial
data in the background, you do not stop to read it.

The data sea can animate slowly — numbers drifting, lines drawing, values
updating at a pace where you only notice the movement if you watch it
directly for a few seconds. This gives the background life without
demanding attention.

The bloom layer sits on top of the data sea, softening it further.
The data feels distant, like looking through fog at something behind it.

Implementation: canvas element with drawn financial shapes gives the most
control. SVG elements with CSS animation also works. The numbers do not
need to be real data — the goal is atmosphere. The first attempt at this
effect should be treated as a draft that will need calibration. The
balance of presence and subtlety is delicate and may need iteration.

### The Glass Card
Centred on screen. Contains only app identity, input fields, and a submit
button. Nothing else.

Material: frosted glass. Because the background is dark the glass should
be light — a very light grey-white, approximately rgba(240, 240, 248,
0.08) to rgba(240, 240, 248, 0.12) for the background, with
backdrop-filter: blur(20px to 40px) creating the frosted quality. The
blur smears the background into softness, making the card visible as a
distinct material while still letting the background through.

The owner confirmed: white-grey glass because it contrasts with the dark
background without having any colour. The brushed glass look means it is
not covering anything — it is actually there in the same scene as the
background. The opaque feeling where you have an idea it is not covering
anything — it is there in the same scene.

Border: rgba(255,255,255,0.12) to rgba(255,255,255,0.18). Faint white
edge defining the card boundary. Slightly brighter at the top where light
would naturally catch a glass surface.

Shadow: 0 24px 60px rgba(0,0,0,0.4). Reinforces that the glass card is
floating above the background.

### Inside The Glass Card
App identity at the top. "JARVIS" or "NVDA Jarvis." Clean, near-white,
Inter, medium weight. Optionally a short descriptor below it — "Trading
Terminal" or similar, small and muted.

Input fields: dark fill inside the glass card — approximately
rgba(0,0,0,0.3) — giving them a darker, contained quality against the
lighter glass. Subtle border. 10px to 12px border radius.

Submit button: pill shaped. Royal blue fill at 60 to 80% opacity. White
text. Full width of the card content area.

The card should feel quiet and premium. Login is a threshold — the user
is about to enter something serious. The card communicates that seriousness.

---

## Spacing and Density

### The Foundational Rule
Cards flex to contain their content. Content is never squished into a
fixed size. If a card needs more space to present its content properly
it takes more space. The owner was clear: the card has to flex to a size
that it has been given. Nothing overlaps, nothing looks like it was
squished into a box it does not fit into.

### Context-Dependent Density

**High-density pages (Dashboard)**: Multiple things share the screen
and none is the main event. Each card is a supporting actor. Spacing is
tighter because the user needs to see multiple things at once to make
decisions. Padding inside cards: 14px to 16px. Gap between cards: 8px
to 10px. Nothing overlaps or squishes, but things are comfortable
neighbours rather than isolated islands.

**Low-density pages (Ledger, profile views)**: Fewer things on screen,
some are the main event. More breathing room. Padding inside cards: 20px
to 28px. Gap between sections: 24px to 32px. Space gives weight to what
matters.

**The calibration rule**: If every element has comfortable internal
padding, never touches its neighbours, and the eye can move between
things without confusion — the density is right. If anything feels
cramped, add space first. If anything feels isolated on a page that
should be information-dense, tighten it.

---

## Component Patterns

### Cards
Every card: Layer 2 specification. Background in #17171f to #1c1c26
range. 0.5px border at rgba(255,255,255,0.06 to 0.08). Meaningful shadow.
Subtle top-edge inner highlight. Very fine grain texture at 2 to 4%
opacity.

On hover: translateY(-2px to -4px), deepened shadow, slightly brighter
border. Transition 200ms deceleration easing.

Cards expanding to reveal content below: bottom border radius goes to 0
when expanded. The revealed panel connects flush with matching border
radius on its bottom corners only.

### Buttons
Always pill shaped to distinguish from cards. Primary: royal blue fill
at 60 to 80% opacity, white text. Secondary: dark fill matching card
surface, muted border and text that brightens on hover. On press:
scale(0.97) for 100ms — the physical press feeling.

### Data Tables
JetBrains Mono throughout. Column headers: small, muted, uppercase,
letter-spaced. Row separators: 0.5px line at very low opacity — not a
visible grid, just enough to define rows. Row hover: faint background
brightening. Positive values in green. Negative values in red. All
other values in default muted data colour. The signal colours are the
primary way to read a table at a glance.

### Status Indicators
Pill shaped badges. Background: signal colour at 8 to 12% opacity.
Text: signal colour at full opacity. Border: signal colour at 20 to 25%
opacity. A faded glow badge that communicates state without shouting.

### Input Fields
10px to 12px border radius. Dark fill. Subtle border that brightens on
focus. Focus glow: box-shadow 0 0 0 3px rgba of blue at 10 to 15%.

---

## Things Claude Code Must Never Do

1. Use pure black (#000000) for any background.

2. Add texture to the background atmosphere. Texture belongs on
   Layer 2 cards only.

3. Use any colour not in the four signal colours plus the base greys.
   No orange, no purple, no teal, no additional accents introduced
   without explicit instruction.

4. Use signal colours decoratively. Green is profit. Red is loss.
   Amber is caution. Blue is informational and identity. Nothing else.

5. Make animations delay function. The button works on press.

6. Use linear easing or bounce easing for any visible transition.

7. Apply rounded corners to flush surfaces. Open edges are square.

8. Use font weight 700 or above for any real content.

9. Make a card a fixed size that constrains its content.

10. Hide navigation sections. All navigation must be visible and
    reachable at all times.

11. Override this design system with component library defaults.
    shadcn, Tailwind defaults, and other library aesthetics are
    starting points only. This design system takes precedence.

12. Substitute a different visual approach silently when something
    is difficult to implement. Flag the difficulty and ask instead.
    The owner would rather know something needs a different approach
    than discover a substitution was made without saying so.

13. Assume generic dark UI conventions apply here. When in doubt, ask.

---

## A Note On Iteration

This design was built through conversation and ideation, not specification.
Some things will need refinement when actually rendered. Particularly:

The login page data sea background effect will likely need multiple
iterations to get the right balance of presence and subtlety. Treat the
first attempt as a draft.

The bloom intensity on the background needs calibration against actual
screen rendering — what looks right in a colour picker may be too strong
or too subtle on display. Test it.

The grain texture on cards is very subtle and easy to get wrong in either
direction — too strong becomes noise, too weak becomes invisible.

When something does not look right, identify which specific value is off
and adjust only that. The system is coherent — changing one thing to fix
a problem often breaks something else. Make small targeted adjustments.

---

Last updated: April 2026
Built through direct ideation with the project owner.

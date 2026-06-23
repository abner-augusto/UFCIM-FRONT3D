---
name: UFCIM
description: Reserve UFC campus rooms through a 3D model of the campus.
colors:
  brand-primary: "#00697D"
  brand-dark: "#00566A"
  brand-mid: "#338797"
  brand-light: "#549BA8"
  brand-soft: "#E6F1F3"
  status-available: "#00B050"
  status-partial: "#F2C200"
  status-reserved: "#D32F2F"
  status-blocked: "#E8650A"
  status-unavailable: "#9E9E9E"
  link: "#185FA5"
  ink: "#111111"
  ink-soft: "#666666"
  muted: "#999999"
  bg: "#FFFFFF"
  surface: "#F7F9F8"
  surface-alt: "#F5F5F5"
  border: "#DDDDDD"
typography:
  display:
    fontFamily: "Roboto, 'Segoe UI', sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Roboto, 'Segoe UI', sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Roboto, 'Segoe UI', sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Roboto, 'Segoe UI', sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  xs: "3px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "0.8rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.bg}"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
    height: "44px"
  button-tertiary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    padding: "0.65rem"
    height: "44px"
---

# Design System: UFCIM

## 1. Overview

**Creative North Star: "The Campus Wayfinder"**

UFCIM is the way the UFC community finds and books a room without leaving the map. The 3D model of the campus is the hero surface: you orient yourself in real physical space, tap the room you want, and the interface walks you from "where is it" to "it's yours" in a few confident steps. Everything else — the availability grid, the reservation flow, the reports — exists to serve that wayfinding act, never to compete with it.

The personality is trustworthy and official with a human, approachable edge. This is the university's real system of record, so it has to read as credible and dependable, but it carries the warmth of a good front desk: plain Brazilian-Portuguese labels, reassuring empty and error states, nothing that intimidates a first-year student. It explicitly rejects two looks. It is **not generic SaaS** (no purple-to-blue gradients, no Inter-for-everything, no hero-metric dashboards, no endless identical card grids). And it is **not a bureaucratic government portal** (no dense gray tables, no tiny text, no flat hierarchy, no intimidating multi-field forms).

The system is mobile-first by conviction, not by breakpoint: students book on phones between classes, so thumb reach, 44px tap targets, and one-handed flows come before any desktop nicety. A single brand teal — drawn from the UFCIM logo — carries the identity across a clean white-and-near-neutral canvas; color is spent deliberately, mostly on the one thing the user came to learn — is this room free.

**Key Characteristics:**
- Map-first: the 3D campus and the room are the hero; forms are a short follow-through.
- One restrained brand teal on a clean light canvas, with a separate, deliberate availability palette.
- Soft-lifted depth: flat at rest, gentle shadows on floating surfaces (map rail, popups, sheets).
- Calm and efficient components — quiet confidence, low friction.
- Mobile-first and WCAG 2.1 AA throughout.

## 2. Colors

A restrained, single-accent system: one brand teal (from the UFCIM logo) on a clean white-to-near-neutral canvas, plus a distinct, functional palette reserved for availability status.

### Primary
The brand teal is taken straight from the UFCIM logo's isometric mark.
- **Campus Teal** (`#00697D`): the brand. Primary actions ("Reservar"), active states, nav highlights, selected hour cells. The one saturated color on most screens; spend it on the primary action and identity, not decoration. White text on it reads 6.3:1 (AA at any size).
- **Campus Teal Deep** (`#00566A`): hover/pressed state for primary teal surfaces.
- **Campus Teal Mist** (`#E6F1F3`): tints for selected/active backgrounds in nav and lists.
- **Campus Teal Mid / Light** (`#338797` / `#549BA8`): the logo's lighter facets. Use only where the deep teal needs a companion (e.g. logo mark, an illustrative chip, the dark-theme primary). Not for body text on white — they fall below 4.5:1.

### Secondary
- **Wayfinder Blue** (`#185FA5`): in-context links and "manage" affordances inside detail panels (e.g. "Gerenciar reserva →"). Never a second brand color; strictly a textual link signal.

### Tertiary — Availability palette (functional, not decorative)
This palette answers the product's core question and is **separate from the brand**. It is the only place loud color is allowed.
- **Free Green** (`#00B050`): a slot/room is available.
- **Partial Amber** (`#F2C200`): partially booked.
- **Booked Red** (`#D32F2F`): reserved, or closed.
- **Blocked Orange** (`#E8650A`): blocked by staff.
- **Unavailable Gray** (`#9E9E9E`): exists but not reservable.

Equipment-status pills reuse the same semantics with soft tints: working (`#D1FAE5` on `#065F46`), broken (`#FEE2E2` on `#991B1B`), warning (`#FEF3C7` on `#92400E`).

### Neutral
- **Ink** (`#111111`): primary text, headings.
- **Ink Soft** (`#666666`): secondary text, supporting copy.
- **Muted** (`#999999`): meta, captions, axis labels. Floor at this lightness for text on white — never lighter for body copy.
- **Canvas** (`#FFFFFF`): app background.
- **Surface** (`#F7F9F8`) / **Surface Alt** (`#F5F5F5`): stat cards, toolbars, resting tinted panels.
- **Border** (`#DDDDDD`) with lighter hairlines (`#EEEEEE`, `#F0F0F0`) for dividers.

### Named Rules
**The Brand-vs-Available Rule.** The brand teal and the availability palette never trade jobs. `#00697D` is identity and action; the availability green `#00B050` means "available". Don't tint UI chrome with the availability green, and don't render a status with the brand teal. (The teal/green split now makes the two read as clearly different hues, not near-twins.)

**The Spent-Color Rule.** On a product screen, saturated color is reserved for the primary action and the availability signal. If an element isn't one of those, it lives in the neutral ramp.

## 3. Typography

**Display / Body / Label Font:** Roboto (with `'Segoe UI', sans-serif` fallback)

**Character:** One humanist sans across the whole system, working through weight and scale rather than competing typefaces. Roboto reads as neutral, legible, and institutional without feeling cold — the right voice for a university system of record. Hierarchy comes from weight contrast (400 body vs 700 headings) and a clear size step, never from a second family.

### Hierarchy
- **Display** (700, 1.3rem, 1.2): page/view titles (e.g. "Buscar Espaços", report headers).
- **Title** (700, 1.2rem, 1.25): the room name in the popup and primary card headings.
- **Body** (400, 0.9–0.95rem, 1.5): default reading text and values. Cap measured prose at 65–75ch.
- **Label** (700, 0.7rem, +0.06em tracking, uppercase): section eyebrows ("Disponibilidade", "Equipamentos") and meta labels. The only sanctioned uppercase.

### Named Rules
**The One-Family Rule.** Roboto does every job. Reach for a heavier weight or a larger step before reaching for a second typeface. Mono is permitted only if a future data/code surface genuinely needs it.

**The Label-Only-Caps Rule.** Uppercase is for short labels and eyebrows (≤4 words). Never uppercase a sentence or a button.

## 4. Elevation

Soft-lifted. Surfaces are flat at rest on the white canvas; gentle, diffuse shadows lift only the things that float above the map or page — the viewer control rail, the RoomPopup, the search sheet, the heatmap card. Depth signals "this floats and is interactive", not decoration. There is no heavy, structural drop-shadow language and no glassmorphism.

### Shadow Vocabulary
- **Resting lift** (`box-shadow: 0 2px 8px rgba(0,0,0,0.12)`): floating map controls, cards, the heatmap and breadcrumb chrome.
- **Floating panel** (`box-shadow: 0 3px 14px rgba(0,0,0,0.16)`): the in-viewer search widget and result list.
- **Modal sheet** (`box-shadow: 0 12px 40px rgba(0,0,0,0.18)`): the RoomPopup / bottom sheet, the surface the user is acting on.

### Named Rules
**The Flat-By-Default Rule.** A surface sitting in the page flow gets no shadow. Shadow is earned by floating above the map or by being a modal. If you're adding a shadow to a static section, use a hairline border or a surface tint instead.

## 5. Components

Components are calm and efficient: rounded but not bubbly, generously tappable, quiet until they're the primary action.

### Buttons
- **Shape:** gently rounded (`10px`), full-width in action stacks, minimum height `44px` (`--tap-min`).
- **Primary:** Campus Teal (`#00697D`) fill, white text, weight 600. The single loud action per screen; label is verb + object ("Reservar 09:00–11:00", "Bloquear Espaço").
- **Hover / Focus:** background shifts to Campus Teal Deep (`#00566A`); needs a visible focus ring for AA.
- **Secondary:** white fill, 1.5px Campus Teal border, teal text. Equal weight, quieter presence.
- **Tertiary:** white fill, 1px neutral border, ink-soft text — low-emphasis actions ("📊 Ver relatório").
- **Disabled:** primary desaturates to `#B8C8C2`; secondary borders/text drop to gray.

### Chips
- **Date / period chips and filter selects:** rounded (`8px`), surface-alt fill at rest, Campus Teal fill with white text when active. Used in the viewer rail popover and space browser toolbar.

### Cards / Containers
- **Corner Style:** `12px` for stat cards, `20px` for the popup/sheet.
- **Background:** white, or Surface (`#F7F9F8`) for resting stat panels.
- **Shadow Strategy:** flat in flow; Modal-sheet shadow only on the popup (see Elevation).
- **Border:** hairline (`#F0F0F0`) dividers inside lists; avoid full card borders when a tint or divider reads cleaner.
- **Internal Padding:** `0.6–1.5rem` depending on density; sheets get the most.
- Cards are used sparingly. Never nest a card in a card.

### Inputs / Fields
- **Style:** white fill, 1px (`#DDD`) border, `8–10px` radius. Mobile font-size 16px to prevent iOS zoom; desktop drops to 0.95rem.
- **Focus:** border shifts to Campus Teal (`#00697D`); keep a clearly visible focus state.
- **Date picker:** native input opened via `showPicker()`; appearance normalized across platforms.

### Navigation
- **Bottom tab bar (mobile, 64px):** the primary nav on phones; icon + label, active item in Campus Teal. Respects `--safe-bottom`.
- **App header (56px):** the UFCIM logo at the left, drawer + notifications; brand teal for active/icon accents.
- **Nav drawer:** list items with Campus Teal Mist (`#E6F1F3`) active background and teal text.

### Signature Component — The 3D Viewer surface
The defining surface. A full-bleed Three.js campus canvas with floating chrome layered over it:
- **Control rail:** a right-edge stack of 44px floating buttons (date/period, building, search, fullscreen) plus a left breadcrumb pill — Google-Maps-style, flat-on-map with Resting-lift shadow.
- **Room pin → RoomPopup:** tapping a pin opens a bottom sheet (`20px` top corners, Modal-sheet shadow, spring entrance). It carries the hourly **availability grid** — a 12-column row of `3px` cells colored by the availability palette — where the user taps free hours to pick a start→end range before reserving. Reserved/blocked cells open an inline detail panel.
- **Block heatmap card (mobile):** a floating top-left card summarizing a block's hourly occupancy with the availability palette.

## 6. Do's and Don'ts

### Do:
- **Do** spend the brand teal (`#00697D`) on the one primary action per screen and on identity; keep everything else in the neutral ramp.
- **Do** use the separate availability palette (`#00B050` / `#F2C200` / `#D32F2F` / `#E8650A` / `#9E9E9E`) only for status, and always pair it with text or an icon — color is never the only signal.
- **Do** keep every tappable control ≥44px (`--tap-min`) and design phone-first.
- **Do** keep body text at Ink (`#111`) or Ink Soft (`#666`); never lighter than Muted (`#999`) for reading copy. Hit AA (4.5:1 body, 3:1 large).
- **Do** earn shadows: flat in flow, lifted only when floating above the map or acting as a modal.
- **Do** write labels as verb + object in plain Brazilian Portuguese ("Reservar 09:00–11:00", not "OK").
- **Do** provide a `prefers-reduced-motion` alternative for every animation, including 3D camera moves and the sheet's spring entrance.

### Don't:
- **Don't** drift toward **generic SaaS**: no purple-to-blue gradients, no Inter, no hero-metric dashboard template, no endless identical card grids, no rounded-icon tile above every heading.
- **Don't** drift toward a **bureaucratic government portal**: no dense gray tables, no sub-12px body text, no flat hierarchy, no intimidating multi-field forms.
- **Don't** use `border-left` / `border-right` greater than 1px as a colored accent stripe on cards, notices, or list items. (Existing instances in `NotificationsPanel.vue` and the RoomPopup blocking notice should be reworked to a full border or background tint.)
- **Don't** mix brand and availability: brand teal `#00697D` is never a status, availability green `#00B050` is never UI chrome.
- **Don't** use gradient text, decorative glassmorphism, or shadows on static in-flow sections.
- **Don't** nest a card inside a card.
- **Don't** uppercase sentences or buttons; reserve caps for ≤4-word labels and eyebrows.

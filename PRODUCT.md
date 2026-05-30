# Product

## Register

product

## Users

The UFC (Universidade Federal do Ceará) community at the Benfica campus / IAUD: students, professors, and administrative & maintenance staff. They open this on a phone between classes or at a desk with a concrete goal — find a free room for a time window and reserve it, or (with the right role) block a space, report broken equipment, or check how rooms are being used. Technical comfort varies widely, from first-year students to senior faculty, so the path from "open app" to "room booked" must be obvious without any training.

## Product Purpose

A space-reservation system for university rooms, navigated through a 3D model of the campus. Users browse buildings and floors, tap a room pin to see live availability for a chosen date and shift, pick an hour range, and reserve it (single or recurring). Staff can block spaces and review occupancy reports; anyone can flag broken equipment. Success looks like a student booking the right available room in seconds and trusting that the availability shown is real.

## Brand Personality

Trustworthy and official, with a human, approachable edge. This is the university's real system of record, so it must read as credible and institutional — but never cold or intimidating. Voice: clear and direct, in Brazilian Portuguese; plain labels over jargon; reassuring in error and empty states. Three words: trustworthy, clear, welcoming.

## Anti-references

- **Generic SaaS**: purple/blue gradients, Inter for everything, the hero-metric dashboard template, endless identical card grids, a rounded-icon tile above every heading.
- **Bureaucratic government portal**: dense gray tables, tiny text, flat hierarchy, intimidating multi-field forms, a "fill this in correctly or else" tone.

## Design Principles

- **Availability you can trust.** The schedule shown is the source of truth; never imply a room is free when it isn't. Real state beats optimistic state.
- **One clear next step.** Every screen has an obvious primary action (find, reserve, block); secondary options stay quiet.
- **Map first, forms second.** The 3D campus and the room are the hero; reservation detail is a short, confident follow-through, not a wall of inputs.
- **Calm institutional confidence.** Restraint and consistency signal "official and well-run"; warmth in copy and small moments of guidance keep it human.
- **Mobile is the real device.** Students book on phones between classes — thumb reach, tap targets, and one-handed flows come first.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body text ≥4.5:1 (large text ≥3:1) against its background; visible focus states; 44px minimum tap targets (already tokenized as `--tap-min`). Honor `prefers-reduced-motion` on every animation, including 3D camera moves and popup/sheet transitions. Brazilian Portuguese is the primary language — keep labels translatable and avoid text baked into images. Availability status must never rely on color alone: pair the green/amber/red cues with text or icons.

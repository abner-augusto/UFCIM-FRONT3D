import { campuses } from '@/data/campuses';

/** "B2-03" → "Sala 03"; falls back to the space name when number is empty. */
export function roomLabel(space: { name: string; number: string }): string {
  // Room number often encodes the block as a prefix (e.g. "B2-03"); strip it so the
  // block isn't repeated, since it already has its own segment.
  const n = (space.number ?? '').trim();
  if (!n) return space.name;
  const dash = n.lastIndexOf('-');
  const room = dash >= 0 ? n.slice(dash + 1).trim() : n;
  return `Sala ${room}`;
}

/** "2" → "Bloco 2"; "Bloco 2" → "Bloco 2"; empty → null. */
export function blockLabel(block?: string | null): string | null {
  // Block values may or may not already include the word "Bloco" — avoid "Bloco Bloco 2".
  const b = (block ?? '').trim();
  if (!b) return null;
  return /^bloco\b/i.test(b) ? b : `Bloco ${b}`;
}

/** Bare block value for labeled rows ("Bloco: …"): "Bloco 2" → "2". */
export function blockValue(block?: string | null): string | null {
  const b = (block ?? '').trim();
  if (!b) return null;
  return b.replace(/^bloco\s*/i, '') || b;
}

/** Campus display name from a route id or stored value: "benfica" → "Benfica". */
export function campusLabel(campusIdOrName?: string | null): string {
  const c = (campusIdOrName ?? '').trim();
  if (!c) return '';
  const match = campuses.find((k) => k.id === c || k.shortName === c || k.name === c);
  return match?.shortName ?? c;
}

/** Department display name from a slug or name: "iaud" → "IAUD". */
export function departmentLabel(dept?: string | null): string {
  const d = (dept ?? '').trim();
  if (!d) return '';
  for (const campus of campuses) {
    const match = campus.departments?.find((x) => x.id === d || x.shortName === d || x.name === d);
    if (match) return match.shortName;
  }
  return d;
}

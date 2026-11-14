import type { RequesterCandidate, RequesterPayload, Reservation } from '@/types/reservation';

// ─── Reserving on someone's behalf (MEL-025) ────────────────────────────────

/** What staff filled in the "Reservar para outra pessoa" block. */
export interface RequesterSelection {
  /** A registered user picked from the search, or null to keep the typed text. */
  user: RequesterCandidate | null;
  /** The search text; it becomes the free-text name when no user is picked. */
  query: string;
  /** Optional phone or e-mail. */
  contact: string;
}

/** Backend caps for the free-text name and the contact. */
export const REQUESTER_TEXT_MAX = 100;

export function emptyRequester(): RequesterSelection {
  return { user: null, query: '', contact: '' };
}

/** The requester's display name, or null when the block is empty. */
export function requesterLabel(selection: RequesterSelection | null): string | null {
  if (!selection) return null;
  if (selection.user) return selection.user.name;
  return selection.query.trim() || null;
}

/**
 * Requester fields for the create endpoints: the picked user's id, or the
 * typed name as free text; the contact only goes along with a requester.
 */
export function requesterPayload(selection: RequesterSelection | null): RequesterPayload {
  if (!selection) return {};
  const contact = selection.contact.trim();
  const payload: RequesterPayload = {};

  if (selection.user) {
    payload.requesterUserId = selection.user.id;
  } else {
    const name = selection.query.trim();
    if (!name) return {};
    payload.requesterName = name.slice(0, REQUESTER_TEXT_MAX);
  }

  if (contact) payload.requesterContact = contact.slice(0, REQUESTER_TEXT_MAX);
  return payload;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudante',
  professor: 'Professor(a)',
  staff: 'Funcionário(a)',
  maintenance: 'Manutenção',
};

export function requesterRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export type RequesterNote =
  | { kind: 'for-me'; text: string }
  | { kind: 'for-other'; text: string; contact: string | null };

/**
 * The line "Minhas Reservas" shows for a reservation made on someone's behalf:
 * "Reservada por <staff> para você" for the requester, "Para: <solicitante>"
 * (plus the contact, which only staff receive) for whoever registered it.
 */
export function reservationRequesterNote(r: Reservation): RequesterNote | null {
  if (r.onBehalfOfMe) {
    return { kind: 'for-me', text: `Reservada por ${r.registeredBy?.name || 'um funcionário'} para você` };
  }
  if (r.requester) {
    return { kind: 'for-other', text: `Para: ${r.requester.name}`, contact: r.requesterContact ?? null };
  }
  return null;
}

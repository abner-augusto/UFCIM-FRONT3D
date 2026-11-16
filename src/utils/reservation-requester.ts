import type { RequesterCandidate, RequesterPayload, RequesterUpdatePayload, Reservation } from '@/types/reservation';

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

export function initialRequesterSelection(reservation?: Reservation | null): RequesterSelection {
  if (!reservation) return emptyRequester();
  const contact = reservation.requesterContact ?? '';
  if (reservation.requesterUserId) {
    const name = reservation.requester?.name ?? '';
    return {
      user: { id: reservation.requesterUserId, name, role: '', department: '' },
      query: name,
      contact,
    };
  }
  const freeName = reservation.requesterName ?? reservation.requester?.name ?? '';
  if (freeName) {
    return { user: null, query: freeName, contact };
  }
  return emptyRequester();
}

export function hasOrphanRequesterContact(selection: RequesterSelection | null): boolean {
  return !!selection && !selection.user && !selection.query.trim() && !!selection.contact.trim();
}

export function confirmRequesterSummary(
  offersRequester: boolean,
  selection: RequesterSelection,
  editing?: Reservation | null,
): { name: string; contact: string | null } | null {
  if (!offersRequester) return null;
  const name = requesterLabel(selection);
  if (name) return { name, contact: selection.contact.trim() || null };
  if (editing?.requesterUserId || editing?.requesterName || editing?.requester) {
    return { name: 'Removido (reserva em seu nome)', contact: null };
  }
  return null;
}

function normalizedRequesterColumns(selection: RequesterSelection): Required<RequesterUpdatePayload> {
  const requesterUserId = selection.user?.id ?? null;
  const requesterName = requesterUserId ? null : (selection.query.trim().slice(0, REQUESTER_TEXT_MAX) || null);
  const hasRequester = !!(requesterUserId || requesterName);
  const requesterContact = hasRequester ? (selection.contact.trim().slice(0, REQUESTER_TEXT_MAX) || null) : null;
  return { requesterUserId, requesterName, requesterContact };
}

function originalRequesterColumns(reservation: Reservation): Required<RequesterUpdatePayload> {
  const requesterUserId = reservation.requesterUserId ?? null;
  const requesterName = requesterUserId ? null : (reservation.requesterName ?? reservation.requester?.name ?? null);
  const requesterContact = requesterUserId || requesterName ? (reservation.requesterContact ?? null) : null;
  return { requesterUserId, requesterName, requesterContact };
}

export function requesterDiffPayload(
  original: Reservation,
  selection: RequesterSelection,
): Required<RequesterUpdatePayload> | null {
  const prev = originalRequesterColumns(original);
  const next = normalizedRequesterColumns(selection);
  if (
    prev.requesterUserId === next.requesterUserId
    && prev.requesterName === next.requesterName
    && prev.requesterContact === next.requesterContact
  ) {
    return null;
  }
  return next;
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
export function requesterSearchStatus(input: {
  active: boolean;
  searching: boolean;
  failed: boolean;
  visibleCount: number;
  totalCount: number;
}): { message: string; showList: boolean } {
  if (!input.active) return { message: '', showList: false };
  if (input.searching) return { message: 'Buscando…', showList: false };
  if (input.failed) return { message: 'Não foi possível buscar agora. O nome digitado será usado.', showList: false };
  if (!input.visibleCount) return { message: 'Ninguém cadastrado com esse nome. O nome digitado será usado.', showList: false };
  const message = input.totalCount > input.visibleCount ? 'Continue digitando para refinar a busca.' : '';
  return { message, showList: true };
}

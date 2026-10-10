import { describe, expect, it } from 'vitest';
import {
  emptyRequester,
  requesterLabel,
  requesterPayload,
  requesterRoleLabel,
  reservationRequesterNote,
} from '@/utils/reservation-requester';
import type { Reservation } from '@/types/reservation';

const MARIA = { id: 'prof-1', name: 'Dra. Maria Costa', role: 'professor', department: 'IAUD' };

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    spaceId: 's1',
    userId: 'staff-1',
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '10:00',
    status: 'confirmed',
    changeOrigin: null,
    recurrenceId: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('requesterPayload (MEL-025)', () => {
  it('sends nothing when the block is empty', () => {
    expect(requesterPayload(emptyRequester())).toEqual({});
    expect(requesterPayload(null)).toEqual({});
  });

  it('sends the registered user id, never the typed text', () => {
    expect(requesterPayload({ user: MARIA, query: 'mar', contact: '' })).toEqual({ requesterUserId: 'prof-1' });
  });

  it('keeps the typed name as free text when nobody is picked', () => {
    expect(requesterPayload({ user: null, query: '  Centro Acadêmico ', contact: '' })).toEqual({
      requesterName: 'Centro Acadêmico',
    });
  });

  it('adds a trimmed contact only alongside a requester', () => {
    expect(requesterPayload({ user: MARIA, query: '', contact: ' 85 99999-0000 ' })).toEqual({
      requesterUserId: 'prof-1',
      requesterContact: '85 99999-0000',
    });
    expect(requesterPayload({ user: null, query: '', contact: 'x@ufc.br' })).toEqual({});
  });
});

describe('requesterLabel (MEL-025)', () => {
  it('names the picked user, else the typed name, else nothing', () => {
    expect(requesterLabel({ user: MARIA, query: 'mar', contact: '' })).toBe('Dra. Maria Costa');
    expect(requesterLabel({ user: null, query: ' Fulano ', contact: '' })).toBe('Fulano');
    expect(requesterLabel(emptyRequester())).toBeNull();
  });
});

describe('requesterRoleLabel', () => {
  it('uses pt-BR role labels', () => {
    expect(requesterRoleLabel('professor')).toBe('Professor(a)');
    expect(requesterRoleLabel('student')).toBe('Estudante');
    expect(requesterRoleLabel('staff')).toBe('Funcionário(a)');
  });
});

describe('reservationRequesterNote (MEL-025)', () => {
  it('marks a reservation made for me with who registered it', () => {
    const r = reservation({
      onBehalfOfMe: true,
      requesterUserId: 'prof-1',
      requester: { userId: 'prof-1', name: 'Dra. Maria Costa' },
      registeredBy: { id: 'staff-1', name: 'Carlos Oliveira' },
    });
    expect(reservationRequesterNote(r)).toEqual({ kind: 'for-me', text: 'Reservada por Carlos Oliveira para você' });
  });

  it('shows staff who they registered it for, with the contact', () => {
    const r = reservation({
      requesterName: 'Centro Acadêmico',
      requester: { userId: null, name: 'Centro Acadêmico' },
      requesterContact: '85 3366-0000',
    });
    expect(reservationRequesterNote(r)).toEqual({ kind: 'for-other', text: 'Para: Centro Acadêmico', contact: '85 3366-0000' });
  });

  it('leaves the contact out when the backend did not send it', () => {
    const r = reservation({ requester: { userId: 'prof-1', name: 'Dra. Maria Costa' } });
    expect(reservationRequesterNote(r)).toEqual({ kind: 'for-other', text: 'Para: Dra. Maria Costa', contact: null });
  });

  it('returns null for a reservation made for oneself', () => {
    expect(reservationRequesterNote(reservation())).toBeNull();
    expect(reservationRequesterNote(reservation({ requester: null }))).toBeNull();
  });
});

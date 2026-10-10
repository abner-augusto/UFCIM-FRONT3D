import { describe, expect, it } from 'vitest';
import {
  CAN_RESERVE_ON_BEHALF,
  canCancelReservation,
  canEditReservation,
  canManageReservation,
  forcedBlockTypeFor,
  hasRole,
} from '@/utils/roles';
import type { Reservation } from '@/types/reservation';

const OWNER = 'owner-1';
const OTHER = 'other-1';
const REQUESTER = 'requester-1';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    spaceId: 's1',
    userId: OWNER,
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

const BEFORE = new Date('2026-10-20T08:00:00');
const DURING = new Date('2026-10-20T09:30:00');
const AFTER = new Date('2026-10-20T11:00:00');

describe('canManageReservation (MEL-023)', () => {
  it.each(['student', 'professor', 'staff'] as const)('lets a %s manage their own reservation', (role) => {
    expect(canManageReservation({ id: OWNER, role }, reservation(), 'edit')).toBe(true);
    expect(canManageReservation({ id: OWNER, role }, reservation(), 'cancel')).toBe(true);
  });

  it.each(['student', 'professor'] as const)("does not let a %s manage someone else's", (role) => {
    expect(canManageReservation({ id: OTHER, role }, reservation(), 'edit')).toBe(false);
    expect(canManageReservation({ id: OTHER, role }, reservation(), 'cancel')).toBe(false);
  });

  it("lets staff manage anyone's reservation", () => {
    expect(canManageReservation({ id: OTHER, role: 'staff' }, reservation(), 'edit')).toBe(true);
  });

  it('never lets maintenance manage reservations', () => {
    expect(canManageReservation({ id: OWNER, role: 'maintenance' }, reservation(), 'cancel')).toBe(false);
  });

  it('denies without a signed-in user', () => {
    expect(canManageReservation(null, reservation(), 'cancel')).toBe(false);
  });
});

describe('canManageReservation — registered requester (MEL-025)', () => {
  const onBehalf = reservation({ requesterUserId: REQUESTER, onBehalfOfMe: true });

  it.each(['student', 'professor'] as const)('lets a %s requester cancel but not edit', (role) => {
    expect(canManageReservation({ id: REQUESTER, role }, onBehalf, 'cancel')).toBe(true);
    expect(canManageReservation({ id: REQUESTER, role }, onBehalf, 'edit')).toBe(false);
  });

  it('gives nobody else cancel rights through the requester', () => {
    expect(canManageReservation({ id: OTHER, role: 'professor' }, onBehalf, 'cancel')).toBe(false);
  });

  it('keeps maintenance out', () => {
    expect(canManageReservation({ id: REQUESTER, role: 'maintenance' }, onBehalf, 'cancel')).toBe(false);
  });
});

describe('canEditReservation (MEL-023)', () => {
  const owner = { id: OWNER, role: 'professor' as const };

  it('allows a confirmed reservation that has not started', () => {
    expect(canEditReservation(owner, reservation(), BEFORE)).toBe(true);
  });

  it('refuses one in progress or over', () => {
    expect(canEditReservation(owner, reservation(), DURING)).toBe(false);
    expect(canEditReservation(owner, reservation(), AFTER)).toBe(false);
  });

  it('refuses a canceled reservation', () => {
    expect(canEditReservation(owner, reservation({ status: 'canceled' }), BEFORE)).toBe(false);
  });

  it("refuses someone else's reservation for a professor", () => {
    expect(canEditReservation({ id: OTHER, role: 'professor' }, reservation(), BEFORE)).toBe(false);
  });

  it('refuses the registered requester (MEL-025)', () => {
    const onBehalf = reservation({ requesterUserId: REQUESTER });
    expect(canEditReservation({ id: REQUESTER, role: 'professor' }, onBehalf, BEFORE)).toBe(false);
  });
});

describe('canCancelReservation (MEL-023)', () => {
  const owner = { id: OWNER, role: 'student' as const };

  it('allows a confirmed reservation until it ends', () => {
    expect(canCancelReservation(owner, reservation(), BEFORE)).toBe(true);
    expect(canCancelReservation(owner, reservation(), DURING)).toBe(true);
  });

  it('refuses one that ended or is canceled', () => {
    expect(canCancelReservation(owner, reservation(), AFTER)).toBe(false);
    expect(canCancelReservation(owner, reservation({ status: 'canceled' }), BEFORE)).toBe(false);
  });

  it("refuses someone else's reservation for a professor, allows it for staff", () => {
    expect(canCancelReservation({ id: OTHER, role: 'professor' }, reservation(), BEFORE)).toBe(false);
    expect(canCancelReservation({ id: OTHER, role: 'staff' }, reservation(), BEFORE)).toBe(true);
  });

  it('allows the registered requester until it ends (MEL-025)', () => {
    const onBehalf = reservation({ requesterUserId: REQUESTER });
    expect(canCancelReservation({ id: REQUESTER, role: 'student' }, onBehalf, BEFORE)).toBe(true);
    expect(canCancelReservation({ id: REQUESTER, role: 'student' }, onBehalf, AFTER)).toBe(false);
  });
});

describe('CAN_RESERVE_ON_BEHALF (MEL-025)', () => {
  it('is staff only', () => {
    expect(hasRole('staff', CAN_RESERVE_ON_BEHALF)).toBe(true);
    for (const role of ['student', 'professor', 'maintenance'] as const) {
      expect(hasRole(role, CAN_RESERVE_ON_BEHALF)).toBe(false);
    }
  });
});

describe('forcedBlockTypeFor', () => {
  it('forces maintenance for the maintenance role (MEL-016)', () => {
    expect(forcedBlockTypeFor('maintenance')).toBe('maintenance');
  });

  it.each(['student', 'professor', 'staff'] as const)(
    'leaves the block type free for %s',
    (role) => {
      expect(forcedBlockTypeFor(role)).toBeNull();
    },
  );

  it('returns null without a role', () => {
    expect(forcedBlockTypeFor(null)).toBeNull();
  });
});

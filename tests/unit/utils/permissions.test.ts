import { describe, expect, it } from 'vitest';
import {
  CAN_ADMIN,
  CAN_BLOCK,
  CAN_CREATE_RECURRING,
  CAN_MANAGE_EQUIPMENT,
  CAN_VIEW_MAINTENANCE_HISTORY,
  CAN_RESERVE,
  CAN_VIEW_REPORTS,
  hasRole,
  type UserRole,
} from '@/utils/roles';
import {
  CAPABILITIES,
  capabilitiesFor,
  hasCapability,
  roleDeniedReason,
  roleHintItems,
  roleSummary,
  whoHasCapability,
  type CapabilityId,
} from '@/utils/permissions';

const ROLES: UserRole[] = ['student', 'professor', 'staff', 'maintenance'];

// The authorization arrays in roles.ts stay the single source of truth.
const SOURCE: Record<CapabilityId, UserRole[]> = {
  reserve: CAN_RESERVE,
  recurring: CAN_CREATE_RECURRING,
  block: CAN_BLOCK,
  reports: CAN_VIEW_REPORTS,
  equipment: CAN_MANAGE_EQUIPMENT,
  'maintenance-history': CAN_VIEW_MAINTENANCE_HISTORY,
  admin: CAN_ADMIN,
};

describe('capability matrix', () => {
  it('covers each roles.ts permission array exactly once', () => {
    expect(CAPABILITIES.map((c) => c.id).sort()).toEqual(Object.keys(SOURCE).sort());
  });

  it('references the roles.ts arrays instead of copying them', () => {
    for (const cap of CAPABILITIES) {
      expect(cap.roles).toBe(SOURCE[cap.id]);
    }
  });

  it('gives every capability a pt-BR label, description and icon', () => {
    for (const cap of CAPABILITIES) {
      expect(cap.label).toBeTruthy();
      expect(cap.description).toBeTruthy();
      expect(cap.icon).toBeTruthy();
    }
  });
});

describe('hasCapability', () => {
  it.each(ROLES)('matches hasRole for every capability (%s)', (role) => {
    for (const id of Object.keys(SOURCE) as CapabilityId[]) {
      expect(hasCapability(id, role)).toBe(hasRole(role, SOURCE[id]));
    }
  });

  it('denies everything without a role', () => {
    for (const id of Object.keys(SOURCE) as CapabilityId[]) {
      expect(hasCapability(id, null)).toBe(false);
    }
  });

  it('keeps the known outcomes (maintenance cannot reserve, student cannot see reports)', () => {
    expect(hasCapability('reserve', 'maintenance')).toBe(false);
    expect(hasCapability('block', 'maintenance')).toBe(true);
    expect(hasCapability('reports', 'student')).toBe(false);
    expect(hasCapability('admin', 'staff')).toBe(true);
  });
});

describe('capabilitiesFor', () => {
  it.each(ROLES)('lists every capability with the granted flag from roles.ts (%s)', (role) => {
    const list = capabilitiesFor(role);
    expect(list.map((c) => c.id)).toEqual(CAPABILITIES.map((c) => c.id));
    for (const cap of list) {
      expect(cap.granted).toBe(hasRole(role, SOURCE[cap.id]));
    }
  });

  it('grants a student only reservations', () => {
    expect(capabilitiesFor('student').filter((c) => c.granted).map((c) => c.id)).toEqual(['reserve']);
  });

  it('grants staff everything', () => {
    expect(capabilitiesFor('staff').every((c) => c.granted)).toBe(true);
  });
});

describe('roleDeniedReason', () => {
  it('returns null when the role has the capability', () => {
    expect(roleDeniedReason('reserve', 'student')).toBeNull();
  });

  it('explains to maintenance what it can do and who reserves', () => {
    expect(roleDeniedReason('reserve', 'maintenance')).toBe(
      'Seu perfil de manutenção pode bloquear salas, ver relatórios de ocupação, tratar chamados e ver o histórico de manutenção; '
        + 'reservas são feitas por alunos, professores e funcionários.',
    );
  });

  it('explains to a student who sees the occupancy reports', () => {
    expect(roleDeniedReason('reports', 'student')).toBe(
      'Seu perfil de aluno pode reservar salas; '
        + 'os relatórios de ocupação estão disponíveis para professores, funcionários e equipe de manutenção.',
    );
  });

  it('falls back to a generic sentence without a role', () => {
    expect(roleDeniedReason('reserve', null)).toBe(
      'Reservas são feitas por alunos, professores e funcionários.',
    );
  });
});

describe('roleSummary', () => {
  it('lists what each role can do', () => {
    expect(roleSummary('student')).toBe('Seu perfil de aluno pode reservar salas.');
    expect(roleSummary('maintenance')).toBe(
      'Seu perfil de manutenção pode bloquear salas, ver relatórios de ocupação, tratar chamados e ver o histórico de manutenção.',
    );
  });

  it('returns null without a role', () => {
    expect(roleSummary(null)).toBeNull();
  });
});

describe('whoHasCapability', () => {
  it('names the role groups from roles.ts', () => {
    expect(whoHasCapability('admin')).toBe('O painel administrativo é exclusivo de funcionários.');
    expect(whoHasCapability('equipment')).toBe(
      'Os chamados de equipamentos são tratados por funcionários e equipe de manutenção.',
    );
  });
});

describe('roleHintItems', () => {
  it.each(ROLES)('returns two or three items for %s', (role) => {
    const items = roleHintItems(role);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('tells maintenance what it can do and that it cannot reserve', () => {
    expect(roleHintItems('maintenance')).toEqual([
      { granted: true, text: 'Bloquear espaços' },
      { granted: true, text: 'Ver relatórios de ocupação' },
      { granted: false, text: 'Reservas são feitas por alunos, professores e funcionários.' },
    ]);
  });

  it('lists only granted items for staff, who can do everything', () => {
    expect(roleHintItems('staff').every((item) => item.granted)).toBe(true);
  });
});

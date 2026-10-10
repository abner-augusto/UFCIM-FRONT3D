import type { Component } from 'vue';
import { BarChart3, CalendarCheck, Lock, Repeat, ShieldCheck, Wrench } from '@lucide/vue';
import {
  CAN_ADMIN,
  CAN_BLOCK,
  CAN_CREATE_RECURRING,
  CAN_MANAGE_EQUIPMENT,
  CAN_RESERVE,
  CAN_VIEW_REPORTS,
  hasRole,
  type UserRole,
} from '@/utils/roles';

/**
 * Role guidance (MEL-008): what each profile can do, in user-facing words.
 *
 * This matrix only describes permissions. The role arrays come from
 * `@/utils/roles` by reference, so no authorization outcome can drift from
 * what `usePermissions`, the router and the backend already enforce.
 */

export type CapabilityId = 'reserve' | 'recurring' | 'block' | 'reports' | 'equipment' | 'admin';

export interface Capability {
  id: CapabilityId;
  /** Short name, shown in the profile and in the first-access hint. */
  label: string;
  /** One sentence on what the capability lets the user do. */
  description: string;
  /** Verb phrase used to summarize a role ("pode bloquear salas, ..."). */
  verb: string;
  /** Sentence saying who has the capability; `who` is a pt-BR list of role groups. */
  deniedHint: (who: string) => string;
  icon: Component;
  roles: UserRole[];
}

export interface CapabilityStatus extends Capability {
  granted: boolean;
}

export interface RoleHintItem {
  granted: boolean;
  text: string;
}

/** Ordered by how often each capability matters to users. */
export const CAPABILITIES: readonly Capability[] = [
  {
    id: 'reserve',
    label: 'Reservar espaços',
    description: 'Escolher um horário livre e reservar a sala pelo mapa ou pela busca.',
    verb: 'reservar salas',
    deniedHint: (who) => `Reservas são feitas por ${who}.`,
    icon: CalendarCheck,
    roles: CAN_RESERVE,
  },
  {
    id: 'recurring',
    label: 'Criar reservas recorrentes',
    description: 'Repetir a mesma reserva toda semana durante um período.',
    verb: 'criar reservas recorrentes',
    deniedHint: (who) => `Reservas recorrentes são criadas por ${who}.`,
    icon: Repeat,
    roles: CAN_CREATE_RECURRING,
  },
  {
    id: 'block',
    label: 'Bloquear espaços',
    description: 'Deixar uma sala indisponível por um período, como em manutenções ou eventos.',
    verb: 'bloquear salas',
    deniedHint: (who) => `Bloqueios são feitos por ${who}.`,
    icon: Lock,
    roles: CAN_BLOCK,
  },
  {
    id: 'reports',
    label: 'Ver relatórios de ocupação',
    description: 'Acompanhar como as salas estão sendo usadas ao longo do tempo.',
    verb: 'ver relatórios de ocupação',
    deniedHint: (who) => `Os relatórios de ocupação estão disponíveis para ${who}.`,
    icon: BarChart3,
    roles: CAN_VIEW_REPORTS,
  },
  {
    id: 'equipment',
    label: 'Tratar chamados de equipamentos',
    description: 'Acompanhar e resolver os problemas relatados nos equipamentos das salas.',
    verb: 'tratar chamados',
    deniedHint: (who) => `Os chamados de equipamentos são tratados por ${who}.`,
    icon: Wrench,
    roles: CAN_MANAGE_EQUIPMENT,
  },
  {
    id: 'admin',
    label: 'Acessar a administração',
    description: 'Abrir o painel administrativo de usuários e espaços.',
    verb: 'acessar a administração',
    deniedHint: (who) => `O painel administrativo é exclusivo de ${who}.`,
    icon: ShieldCheck,
    roles: CAN_ADMIN,
  },
];

/** Singular noun for "Seu perfil de …". */
export const ROLE_NOUNS: Record<UserRole, string> = {
  student: 'aluno',
  professor: 'professor',
  staff: 'funcionário',
  maintenance: 'manutenção',
};

/** Plural group name for "… são feitas por …". */
const ROLE_GROUPS: Record<UserRole, string> = {
  student: 'alunos',
  professor: 'professores',
  staff: 'funcionários',
  maintenance: 'equipe de manutenção',
};

function getCapability(id: CapabilityId): Capability {
  const cap = CAPABILITIES.find((c) => c.id === id);
  if (!cap) throw new Error(`Unknown capability: ${id}`);
  return cap;
}

/** Joins items as a pt-BR list: "a", "a e b", "a, b e c". */
function joinPtBr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function deniedHintFor(cap: Capability): string {
  return cap.deniedHint(joinPtBr(cap.roles.map((r) => ROLE_GROUPS[r])));
}

/** "Seu perfil de manutenção pode bloquear salas, …", without the final period. */
function summaryClause(role: UserRole | null): string | null {
  if (!role) return null;
  const verbs = capabilitiesFor(role).filter((c) => c.granted).map((c) => c.verb);
  if (verbs.length === 0) return null;
  return `Seu perfil de ${ROLE_NOUNS[role]} pode ${joinPtBr(verbs)}`;
}

export function hasCapability(id: CapabilityId, role: UserRole | null): boolean {
  return hasRole(role, getCapability(id).roles);
}

/** Every capability, flagged with whether `role` has it. */
export function capabilitiesFor(role: UserRole | null): CapabilityStatus[] {
  return CAPABILITIES.map((cap) => ({ ...cap, granted: hasRole(role, cap.roles) }));
}

/** Sentence naming the roles that have the capability. */
export function whoHasCapability(id: CapabilityId): string {
  return deniedHintFor(getCapability(id));
}

/** One sentence on what the role can do, or null without a role. */
export function roleSummary(role: UserRole | null): string | null {
  const clause = summaryClause(role);
  return clause ? `${clause}.` : null;
}

/**
 * Why a CTA is unavailable to `role`, or null when the role has the capability.
 * Says what the profile can do, then who has the missing capability.
 */
export function roleDeniedReason(id: CapabilityId, role: UserRole | null): string | null {
  const cap = getCapability(id);
  if (hasRole(role, cap.roles)) return null;

  const hint = deniedHintFor(cap);
  const clause = summaryClause(role);
  return clause ? `${clause}; ${lowerFirst(hint)}` : hint;
}

/**
 * Two or three bullets for the first-access hint. When the role cannot reserve,
 * or has fewer than two capabilities, the last bullet explains the first
 * capability it lacks.
 */
export function roleHintItems(role: UserRole): RoleHintItem[] {
  const all = capabilitiesFor(role);
  const granted = all.filter((c) => c.granted);
  const firstDenied = all.find((c) => !c.granted);
  const showDenied = !!firstDenied && (!hasCapability('reserve', role) || granted.length < 2);

  const items: RoleHintItem[] = granted
    .slice(0, showDenied ? 2 : 3)
    .map((c) => ({ granted: true, text: c.label }));
  if (showDenied && firstDenied) items.push({ granted: false, text: deniedHintFor(firstDenied) });
  return items;
}

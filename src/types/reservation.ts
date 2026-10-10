export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type ReservationStatus = 'confirmed' | 'canceled' | 'modified' | 'overridden';

export const TIME_SLOT_RANGES: Record<TimeSlot, { startTime: string; endTime: string }> = {
  morning:   { startTime: '07:00', endTime: '12:00' },
  afternoon: { startTime: '13:00', endTime: '18:00' },
  evening:   { startTime: '19:00', endTime: '22:00' },
};

export interface AvailabilitySlot {
  startTime: string; // "HH:00" or "HH:30" (30-minute slots, MEL-024)
  endTime: string;   // "HH:00" or "HH:30" (last slot of day uses "24:00")
  status: 'available' | 'reserved' | 'blocked' | 'closed' | 'not_reservable';
  reservation?: {
    id: string;
    purpose: string;
    description: string | null;
    isRecurring: boolean;
    isSelf: boolean;
    author: { displayName: string; role: string };
  };
  blocking?: {
    id: string;
    blockType: string;
    reason: string | null;
    rangeStartDate: string;
    rangeEndDate: string;
    author: { displayName: string; role: string };
  };
}

// The availability endpoint returns AvailabilitySlot[] directly (no wrapper object).
export type Availability = AvailabilitySlot[];

/**
 * Returns true only if the named range is fully covered by 'available' slots
 * (half-hour or hourly). morning: 07:00–12:00, afternoon: 13:00–18:00, evening: 19:00–22:00
 */
export function isSlotAvailable(availability: Availability, slot: TimeSlot): boolean {
  const { startTime, endTime } = TIME_SLOT_RANGES[slot];
  const inRange = availability
    .filter((s) => s.startTime < endTime && s.endTime > startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (!inRange.length || inRange[0].startTime > startTime || inRange[inRange.length - 1].endTime < endTime) {
    return false;
  }
  return inRange.every(
    (s, i) => s.status === 'available' && (i === 0 || inRange[i - 1].endTime === s.startTime),
  );
}

export interface Reservation {
  id: string;
  spaceId: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  cancelReason?: string | null;
  changeOrigin: string | null;
  recurrenceId: string | null;
  purpose?: string | null;
  /** Free text the user typed when booking (backend caps it at 100 chars). */
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  space?: { id: string; number: string; name: string; block?: string; campus?: string; type?: string; capacity?: number; department?: string; [key: string]: unknown };
}

export interface RecurringReservationSkipped {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface RecurringReservationResult {
  recurrenceId: string;
  created: Reservation[];
  skipped: RecurringReservationSkipped[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Blocking {
  id: string;
  spaceId: string;
  spaceName?: string;
  space?: {
    id: string;
    number: string;
    name: string;
    block: string;
    campus: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  blockType: 'maintenance' | 'administrative';
  reason: string | null;
  status: 'active' | 'removed';
  /** Shared by every day created in a single multi-day operation (MEL-017). */
  batchId?: string | null;
  createdAt: string;
}

/** Response of POST /blockings after MEL-017 (one row per day). */
export interface BlockingBatchResult {
  blockings: Blocking[];
  created: number;
  overriddenReservations: number;
}

export const BLOCK_TYPE_LABELS: Record<Blocking['blockType'], string> = {
  maintenance: 'Manutenção',
  administrative: 'Administrativo',
};

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
};

export const PURPOSE_OPTIONS = [
  { value: 'class', label: 'Aula' },
  { value: 'group_study', label: 'Estudo em grupo' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Outro' },
] as const;

export const PURPOSE_LABELS: Record<string, string> = {
  class: 'Aula',
  group_study: 'Estudo',
  meeting: 'Reunião',
  event: 'Evento',
  other: 'Outro',
};

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: 'Confirmada',
  canceled: 'Cancelada',
  modified: 'Modificada',
  overridden: 'Sobreposta por bloqueio',
};

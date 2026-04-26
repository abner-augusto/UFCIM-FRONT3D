export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type ReservationStatus = 'confirmed' | 'canceled' | 'modified' | 'overridden';

export const TIME_SLOT_RANGES: Record<TimeSlot, { startTime: string; endTime: string }> = {
  morning:   { startTime: '07:00', endTime: '12:00' },
  afternoon: { startTime: '13:00', endTime: '18:00' },
  evening:   { startTime: '19:00', endTime: '22:00' },
};

export interface AvailabilitySlot {
  startTime: string; // "HH:00"
  endTime: string;   // "HH:00" (last slot of day uses "24:00")
  status: 'available' | 'reserved' | 'blocked' | 'closed';
}

// The availability endpoint returns AvailabilitySlot[] directly (no wrapper object).
export type Availability = AvailabilitySlot[];

/**
 * Returns true only if every hourly slot in the named range is 'available'.
 * morning: 07:00–12:00, afternoon: 13:00–18:00, evening: 19:00–22:00
 */
export function isSlotAvailable(availability: Availability, slot: TimeSlot): boolean {
  const { startTime, endTime } = TIME_SLOT_RANGES[slot];
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  for (let h = startHour; h < endHour; h++) {
    const key = `${String(h).padStart(2, '0')}:00`;
    const entry = availability.find(s => s.startTime === key);
    if (!entry || entry.status !== 'available') return false;
  }
  return true;
}

export interface Reservation {
  id: string;
  spaceId: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  changeOrigin: string | null;
  recurrenceId: string | null;
  purpose?: string | null;
  createdAt: string;
  updatedAt: string;
  space?: { id: string; number: string; name: string; block?: string; campus?: string; [key: string]: any };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: 'Confirmada',
  canceled: 'Cancelada',
  modified: 'Modificada',
  overridden: 'Sobreposta por bloqueio',
};

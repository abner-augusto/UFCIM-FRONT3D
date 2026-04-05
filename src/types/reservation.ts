export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export const TIME_SLOT_RANGES: Record<TimeSlot, { startTime: string; endTime: string }> = {
  morning:   { startTime: '08:00', endTime: '12:00' },
  afternoon: { startTime: '13:00', endTime: '17:00' },
  evening:   { startTime: '18:00', endTime: '22:00' },
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
 * morning: 08:00–12:00, afternoon: 13:00–17:00, evening: 18:00–22:00
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
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Blocking {
  id: string;
  spaceId: string;
  spaceName?: string;
  date: string;
  startTime: string;
  endTime: string;
  blockType: 'maintenance' | 'administrative' | 'event';
  reason: string | null;
  status: 'active' | 'removed';
  createdAt: string;
}

export const BLOCK_TYPE_LABELS: Record<Blocking['blockType'], string> = {
  maintenance: 'Manutenção',
  administrative: 'Administrativo',
  event: 'Evento',
};

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
};

export const PURPOSE_OPTIONS = [
  { value: 'estudo', label: 'Estudo' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'aula', label: 'Aula' },
  { value: 'evento', label: 'Evento' },
] as const;

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
};

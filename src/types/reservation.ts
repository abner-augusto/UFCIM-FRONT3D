export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Availability {
  date: string;
  slots: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

export interface Reservation {
  id: string;
  spaceId: string;
  spaceName: string;
  date: string;
  timeSlot: TimeSlot;
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

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Manhã (08h–12h)',
  afternoon: 'Tarde (13h–17h)',
  evening: 'Noite (18h–22h)',
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

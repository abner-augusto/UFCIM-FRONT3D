export interface Summary {
  ocupacaoMedia: number; // percentage (0–100)
  totalReservas: number;
  salasUsadas: number;
}

export interface DailyPoint {
  date: string; // ISO date
  ocupacao: number;
  reservas: number;
}

export interface TurnoData {
  turno: string; // "Manhã" | "Tarde" | "Noite"
  reservas: number;
}

export interface SpaceReport {
  id: string;
  nome: string;
  numero: string;
  bloco: string;
  tipo: string;
  capacidade: number;
  reservas: number;
  taxaOcupacao: number; // percentage (0–100)
}

export interface OccupancyReport {
  summary: Summary;
  daily: DailyPoint[];
  turnos: TurnoData[];
  spaces: SpaceReport[];
}

// --- MEL-005: Individual space report ---

export interface SpaceReportData {
  space: {
    id: string;
    name: string;
    number: string;
    block: string;
    type: string;
    capacity: number | null;
    department: string;
  };
  range: { startDate: string; endDate: string; days: number };
  summary: {
    totalReservations: number;
    totalCanceledReservations: number;
    totalBlockings: number;
    occupancyRate: number;
    averageDailyOccupancy: number;
    peakDay: { date: string; occupancyRate: number } | null;
    peakHour: { hour: string; occupancyRate: number } | null;
    distinctUsersWhoReserved: number;
  };
  dailySeries: Array<{ date: string; occupancyRate: number; reservations: number; blockings: number }>;
  hourlyAverage: Array<{ hour: string; occupancyRate: number }>;
  reservations: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    purpose: string | null;
    description: string | null;
    isRecurring: boolean;
    author: { displayName: string; role: string };
  }>;
  blockings: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    blockType: string;
    reason: string | null;
    author: { displayName: string; role: string };
  }>;
}

export interface Summary {
  ocupacaoMedia: number; // percentage (0–100)
  totalReservas: number;
  salasUsadas: number;
  picoConcorrencia: number;
  picoHorario: string; // e.g. "10:00"
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

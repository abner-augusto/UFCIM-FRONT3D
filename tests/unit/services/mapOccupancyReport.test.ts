import { describe, expect, it } from 'vitest';
import { mapOccupancyReport, RawOccupancyReport } from '@/services/api';

describe('mapOccupancyReport', () => {
  it('counts only rooms with reservations (the bug fix)', () => {
    const raw: RawOccupancyReport = {
      totalOccupancyRate: 50,
      spaces: [
        { id: '1', name: 'A', totalReservations: 0 },
        { id: '2', name: 'B', totalReservations: 0 },
        { id: '3', name: 'C', totalReservations: 0 },
      ],
    };
    const result = mapOccupancyReport(raw);
    expect(result.summary.salasUsadas).toBe(0);
    expect(result.summary.totalReservas).toBe(0);
  });

  it('counts mixed reservations correctly', () => {
    const raw: RawOccupancyReport = {
      totalOccupancyRate: 60,
      spaces: [
        { id: '1', name: 'A', totalReservations: 2 },
        { id: '2', name: 'B', totalReservations: 0 },
        { id: '3', name: 'C', totalReservations: 1 },
      ],
    };
    const result = mapOccupancyReport(raw);
    expect(result.summary.salasUsadas).toBe(2);
    expect(result.summary.totalReservas).toBe(3);
  });

  it('treats undefined totalReservations as 0', () => {
    const raw: RawOccupancyReport = {
      totalOccupancyRate: 30,
      spaces: [
        { id: '1', name: 'A', totalReservations: 1 },
        { id: '2', name: 'B' },
      ],
    };
    const result = mapOccupancyReport(raw);
    expect(result.summary.salasUsadas).toBe(1);
    expect(result.summary.totalReservas).toBe(1);
  });

  it('handles undefined spaces gracefully', () => {
    const raw: RawOccupancyReport = {
      totalOccupancyRate: 0,
    };
    const result = mapOccupancyReport(raw);
    expect(result.summary.salasUsadas).toBe(0);
    expect(result.summary.totalReservas).toBe(0);
    expect(result.spaces).toEqual([]);
  });

  it('maps daily and turnos with defaults', () => {
    const raw: RawOccupancyReport = {
      totalOccupancyRate: 40,
      daily: [{ date: '2026-01-01' }],
      byTurno: [{ turno: 'Manhã' }],
      spaces: [],
    };
    const result = mapOccupancyReport(raw);
    expect(result.daily).toEqual([{ date: '2026-01-01', ocupacao: 0, reservas: 0 }]);
    expect(result.turnos).toEqual([{ turno: 'Manhã', reservas: 0 }]);
  });
});

import { describe, expect, it } from 'vitest';
import { airQualityCsv, airQualityCsvFileName } from '@/utils/air-quality-csv';
import { CAN_EXPORT_SENSOR_DATA, hasRole } from '@/utils/roles';
import type { AirQualityHistoryPoint } from '@/types/air-quality';

function point(overrides: Partial<AirQualityHistoryPoint> = {}): AirQualityHistoryPoint {
  return {
    measuredAt: '2026-11-03T17:00:00.000Z',
    co2Ppm: 512.4567,
    co2PpmMax: 610,
    pm1Ugm3: 4,
    pm25Ugm3: 5.25,
    pm25Ugm3Max: 8,
    pm10Ugm3: 6,
    tvocMgm3: 0.0034,
    hchoMgm3: 0.002,
    temperatureC: 29.5,
    humidityPct: 61,
    batteryPct: 100,
    samples: 60,
    ...overrides,
  };
}

describe('airQualityCsv', () => {
  it('writes a header and one row per hour, in campus time, ready for a pt-BR spreadsheet', () => {
    const lines = airQualityCsv([point()]).split('\r\n');
    expect(lines[0]).toBe(
      'Início da hora (Fortaleza);CO₂ (ppm, média);CO₂ (ppm, máx.);PM2.5 (µg/m³, média);PM2.5 (µg/m³, máx.);'
        + 'PM10 (µg/m³);PM1 (µg/m³);TVOC (mg/m³);Formaldeído (mg/m³);Temperatura (°C);Umidade (%);Bateria (%);Amostras',
    );
    expect(lines[1]).toBe('03/11/2026 14:00;512,457;610;5,25;8;6;4;0,003;0,002;29,5;61;100;60');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('');
  });

  it('leaves missing values empty instead of writing zero', () => {
    const row = airQualityCsv([point({ hchoMgm3: null, co2PpmMax: null, batteryPct: null })]).split('\r\n')[1];
    expect(row).toBe('03/11/2026 14:00;512,457;;5,25;8;6;4;0,003;;29,5;61;;60');
  });

  it('writes only the header when there are no points', () => {
    expect(airQualityCsv([]).split('\r\n')).toHaveLength(2);
  });
});

describe('airQualityCsvFileName', () => {
  it('names the file after the room and the period, without accents or spaces', () => {
    expect(airQualityCsvFileName('Sala de Aula 09', '2026-10-04', '2026-11-03')).toBe(
      'qualidade-do-ar_sala-de-aula-09_2026-10-04_2026-11-03.csv',
    );
    expect(airQualityCsvFileName('Ateliê / Bloco 3', '2026-11-01', '2026-11-03')).toBe(
      'qualidade-do-ar_atelie-bloco-3_2026-11-01_2026-11-03.csv',
    );
  });
});

describe('CAN_EXPORT_SENSOR_DATA', () => {
  it.each([
    ['staff', true],
    ['professor', true],
    ['maintenance', false],
    ['student', false],
  ] as const)('%s → %s', (role, allowed) => {
    expect(hasRole(role, CAN_EXPORT_SENSOR_DATA)).toBe(allowed);
  });
});

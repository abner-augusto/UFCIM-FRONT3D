import { describe, expect, it } from 'vitest';
import { airLevel, formatReadingAge, overallAirLevel, AIR_METRICS } from '@/utils/air-quality';
import type { AirQualityReading } from '@/types/air-quality';

function reading(overrides: Partial<AirQualityReading> = {}): AirQualityReading {
  return {
    measuredAt: '2026-11-03T17:41:00.000Z',
    co2Ppm: 484,
    pm1Ugm3: 4,
    pm25Ugm3: 5,
    pm10Ugm3: 6,
    tvocMgm3: 0.003,
    hchoMgm3: 0.002,
    temperatureC: 30,
    humidityPct: 59,
    batteryPct: 100,
    ...overrides,
  };
}

describe('airLevel', () => {
  it('bands CO₂ at 800 and the ANVISA 1000 ppm limit', () => {
    expect(airLevel('co2Ppm', 800)).toBe('good');
    expect(airLevel('co2Ppm', 1000)).toBe('moderate');
    expect(airLevel('co2Ppm', 1001)).toBe('poor');
  });

  it('bands particles on the WHO guideline and interim target 3', () => {
    expect(airLevel('pm25Ugm3', 15)).toBe('good');
    expect(airLevel('pm25Ugm3', 37.5)).toBe('moderate');
    expect(airLevel('pm10Ugm3', 76)).toBe('poor');
  });

  it('treats formaldehyde above 0.1 mg/m³ as poor, with no middle band', () => {
    expect(airLevel('hchoMgm3', 0.1)).toBe('good');
    expect(airLevel('hchoMgm3', 0.101)).toBe('poor');
  });

  it('marks comfort metrics outside the range as moderate, never poor', () => {
    expect(airLevel('temperatureC', 24)).toBe('good');
    expect(airLevel('temperatureC', 35)).toBe('moderate');
    expect(airLevel('humidityPct', 90)).toBe('moderate');
  });

  it('is unknown without a value or for PM1, which has no reference', () => {
    expect(airLevel('co2Ppm', null)).toBe('unknown');
    expect(airLevel('pm1Ugm3', 4)).toBe('unknown');
  });
});

describe('overallAirLevel', () => {
  it('takes the worst pollutant and ignores temperature and humidity', () => {
    expect(overallAirLevel(reading())).toBe('good');
    expect(overallAirLevel(reading({ temperatureC: 40 }))).toBe('good');
    expect(overallAirLevel(reading({ co2Ppm: 950, pm25Ugm3: 50 }))).toBe('poor');
  });

  it('is unknown without a reading or without any pollutant value', () => {
    expect(overallAirLevel(null)).toBe('unknown');
    expect(overallAirLevel(reading({ co2Ppm: null, pm25Ugm3: null, pm10Ugm3: null, tvocMgm3: null, hchoMgm3: null }))).toBe('unknown');
  });
});

describe('formatting', () => {
  it('describes the reading age in Portuguese', () => {
    const now = new Date('2026-11-03T18:00:00.000Z');
    expect(formatReadingAge('2026-11-03T17:59:40.000Z', now)).toBe('agora');
    expect(formatReadingAge('2026-11-03T17:57:00.000Z', now)).toBe('há 3 min');
    expect(formatReadingAge('2026-11-03T16:00:00.000Z', now)).toBe('há 2 h');
    expect(formatReadingAge('2026-11-02T17:00:00.000Z', now)).toBe('há 1 dia');
  });

  it('formats TVOC with three decimals and a comma', () => {
    const tvoc = AIR_METRICS.find((m) => m.key === 'tvocMgm3')!;
    expect(tvoc.format(0.003)).toBe('0,003');
  });
});

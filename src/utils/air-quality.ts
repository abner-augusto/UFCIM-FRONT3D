import type { AirQualityReading } from '@/types/air-quality';

/**
 * Air quality bands for the room popup. They come from indoor-air references,
 * not from the sensor's own screen colors, whose criteria are unpublished:
 *
 * - CO₂: ANVISA RE nº 9/2003 recommends ≤ 1000 ppm indoors; "good" stops at
 *   800 ppm to flag a room before it reaches the limit.
 * - PM2.5 / PM10: WHO Air Quality Guidelines 2021, 24-h guideline (15 / 45 µg/m³)
 *   and interim target 3 (37.5 / 75 µg/m³).
 * - TVOC: German Environment Agency (UBA) hygienic levels, 0.3 and 1 mg/m³.
 *   The sensor's TVOC is a trend indicator, not a reference measurement.
 * - HCHO: WHO indoor guideline, 0.1 mg/m³.
 * - Temperature / humidity: ANVISA RE nº 9/2003 comfort range (23–26 °C,
 *   40–65 %). Outside it is "moderate" (discomfort), never "poor".
 */
export type AirLevel = 'good' | 'moderate' | 'poor' | 'unknown';

export type AirMetricKey = 'co2Ppm' | 'pm25Ugm3' | 'pm10Ugm3' | 'pm1Ugm3' | 'tvocMgm3' | 'hchoMgm3' | 'temperatureC' | 'humidityPct';

export const AIR_LEVEL_LABELS: Record<AirLevel, string> = {
  good: 'Bom',
  moderate: 'Moderado',
  poor: 'Ruim',
  unknown: 'Sem dado',
};

/** Upper bound of "good" and of "moderate"; above the second is "poor". */
export const AIR_BANDS: Partial<Record<AirMetricKey, readonly [number, number]>> = {
  co2Ppm: [800, 1000],
  pm25Ugm3: [15, 37.5],
  pm10Ugm3: [45, 75],
  tvocMgm3: [0.3, 1],
  hchoMgm3: [0.1, 0.1],
};

export const AIR_COMFORT: Partial<Record<AirMetricKey, readonly [number, number]>> = {
  temperatureC: [23, 26],
  humidityPct: [40, 65],
};

export function airLevel(metric: AirMetricKey, value: number | null | undefined): AirLevel {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'unknown';
  const comfort = AIR_COMFORT[metric];
  if (comfort) return value >= comfort[0] && value <= comfort[1] ? 'good' : 'moderate';
  const bands = AIR_BANDS[metric];
  if (!bands) return 'unknown';
  if (value <= bands[0]) return 'good';
  if (value <= bands[1]) return 'moderate';
  return 'poor';
}

/** The worst level among the pollutants: the room's headline. Comfort metrics don't count. */
export function overallAirLevel(reading: AirQualityReading | null): AirLevel {
  if (!reading) return 'unknown';
  const order: AirLevel[] = ['good', 'moderate', 'poor'];
  const levels = (Object.keys(AIR_BANDS) as AirMetricKey[])
    .map((metric) => airLevel(metric, reading[metric]))
    .filter((level) => level !== 'unknown');
  if (!levels.length) return 'unknown';
  return levels.reduce((worst, level) => (order.indexOf(level) > order.indexOf(worst) ? level : worst), 'good');
}

const decimals = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const INTEGER = decimals(0);
const THREE = decimals(3);

export interface AirMetricDisplay {
  key: AirMetricKey;
  label: string;
  unit: string;
  format: (value: number) => string;
}

export const AIR_METRICS: AirMetricDisplay[] = [
  { key: 'co2Ppm', label: 'CO₂', unit: 'ppm', format: (v) => INTEGER.format(v) },
  { key: 'pm25Ugm3', label: 'PM2.5', unit: 'µg/m³', format: (v) => INTEGER.format(v) },
  { key: 'pm10Ugm3', label: 'PM10', unit: 'µg/m³', format: (v) => INTEGER.format(v) },
  { key: 'pm1Ugm3', label: 'PM1', unit: 'µg/m³', format: (v) => INTEGER.format(v) },
  { key: 'tvocMgm3', label: 'TVOC', unit: 'mg/m³', format: (v) => THREE.format(v) },
  { key: 'hchoMgm3', label: 'Formaldeído', unit: 'mg/m³', format: (v) => THREE.format(v) },
  { key: 'temperatureC', label: 'Temperatura', unit: '°C', format: (v) => INTEGER.format(v) },
  { key: 'humidityPct', label: 'Umidade', unit: '%', format: (v) => INTEGER.format(v) },
];

/** "agora", "há 3 min", "há 2 h", "há 4 dias". */
export function formatReadingAge(measuredAt: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(measuredAt).getTime()) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

/**
 * Pollutants shown on a reference scale (popup bands). The scale ends past the
 * "poor" threshold so a poor value still lands inside the track.
 */
export const AIR_BAND_ROWS: Array<{ key: AirMetricKey; scaleMax: number }> = [
  { key: 'co2Ppm', scaleMax: 1500 },
  { key: 'pm25Ugm3', scaleMax: 60 },
  { key: 'pm10Ugm3', scaleMax: 120 },
  { key: 'tvocMgm3', scaleMax: 1.5 },
  { key: 'hchoMgm3', scaleMax: 0.2 },
];

/** Position of `value` on a 0…scaleMax track, as a 0–100 percentage, clamped. */
export function bandPercent(value: number, scaleMax: number): number {
  if (!Number.isFinite(value) || scaleMax <= 0) return 0;
  return Math.min(100, Math.max(0, (value / scaleMax) * 100));
}

/** A color stop along the value axis, for a line colored by its level. */
export interface LevelStop {
  value: number;
  level: Exclude<AirLevel, 'unknown'>;
}

/**
 * Stops for coloring a chart line by value: green inside the acceptable band,
 * yellow through "moderate", red from the poor threshold up. Comfort metrics go
 * yellow below and above their range. Empty when the metric has no reference.
 */
export function levelStops(metric: AirMetricKey): LevelStop[] {
  const comfort = AIR_COMFORT[metric];
  if (comfort) {
    const [lo, hi] = comfort;
    const margin = (hi - lo) * 0.15;
    return [
      { value: lo - margin, level: 'moderate' },
      { value: lo, level: 'good' },
      { value: hi, level: 'good' },
      { value: hi + margin, level: 'moderate' },
    ];
  }
  const bands = AIR_BANDS[metric];
  if (!bands) return [];
  const [good, moderate] = bands;
  if (good === moderate) {
    return [
      { value: good * 0.8, level: 'good' },
      { value: good, level: 'poor' },
    ];
  }
  return [
    { value: good, level: 'good' },
    { value: (good + moderate) / 2, level: 'moderate' },
    { value: moderate, level: 'poor' },
  ];
}

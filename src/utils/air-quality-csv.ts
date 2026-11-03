import type { AirQualityHistoryPoint } from '@/types/air-quality';

/**
 * Hourly air-quality history as CSV for a pt-BR spreadsheet: `;` between
 * fields, decimal comma, campus time (UTC−3) and an empty cell where the sensor
 * sent nothing. The caller prepends the UTF-8 BOM so Excel reads the accents.
 */
const COLUMNS: Array<{ header: string; value: (p: AirQualityHistoryPoint) => number | null }> = [
  { header: 'CO₂ (ppm, média)', value: (p) => p.co2Ppm },
  { header: 'CO₂ (ppm, máx.)', value: (p) => p.co2PpmMax },
  { header: 'PM2.5 (µg/m³, média)', value: (p) => p.pm25Ugm3 },
  { header: 'PM2.5 (µg/m³, máx.)', value: (p) => p.pm25Ugm3Max },
  { header: 'PM10 (µg/m³)', value: (p) => p.pm10Ugm3 },
  { header: 'PM1 (µg/m³)', value: (p) => p.pm1Ugm3 },
  { header: 'TVOC (mg/m³)', value: (p) => p.tvocMgm3 },
  { header: 'Formaldeído (mg/m³)', value: (p) => p.hchoMgm3 },
  { header: 'Temperatura (°C)', value: (p) => p.temperatureC },
  { header: 'Umidade (%)', value: (p) => p.humidityPct },
  { header: 'Bateria (%)', value: (p) => p.batteryPct },
  { header: 'Amostras', value: (p) => p.samples },
];

const CAMPUS_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Fortaleza',
});

const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3, useGrouping: false });

function cell(text: string): string {
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function airQualityCsv(points: AirQualityHistoryPoint[]): string {
  const header = ['Início da hora (Fortaleza)', ...COLUMNS.map((c) => c.header)];
  const rows = points.map((p) => [
    CAMPUS_TIME.format(new Date(p.measuredAt)).replace(', ', ' '),
    ...COLUMNS.map((c) => {
      const value = c.value(p);
      return value === null ? '' : DECIMAL.format(value);
    }),
  ]);
  return [header, ...rows].map((fields) => fields.map(cell).join(';')).join('\r\n') + '\r\n';
}

/** "qualidade-do-ar_sala-09_2026-10-04_2026-11-03.csv" */
export function airQualityCsvFileName(spaceLabel: string, from: string, to: string): string {
  const slug = spaceLabel
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `qualidade-do-ar_${slug || 'sala'}_${from}_${to}.csv`;
}

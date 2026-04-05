export type PeriodKey = 'morning' | 'afternoon' | 'evening';

export const PERIOD_HOURS: Record<PeriodKey, { start: number; end: number }> = {
  morning: { start: 7, end: 13 },
  afternoon: { start: 13, end: 19 },
  evening: { start: 19, end: 23 },
};

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
};

export function getCurrentPeriod(): PeriodKey {
  const hour = new Date().getHours();
  if (hour >= PERIOD_HOURS.morning.start && hour < PERIOD_HOURS.morning.end) return 'morning';
  if (hour >= PERIOD_HOURS.afternoon.start && hour < PERIOD_HOURS.afternoon.end) return 'afternoon';
  if (hour >= PERIOD_HOURS.evening.start && hour < PERIOD_HOURS.evening.end) return 'evening';
  return 'morning';
}

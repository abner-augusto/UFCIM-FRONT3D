/**
 * How many dates in [startDate, endDate] fall on one of `daysOfWeek`
 * (0 = Sunday), i.e. how many reservations a series would try to create.
 * Mirrors the backend's date generation; conflicts it skips are not known here.
 */
export function countRecurringDates(startDate: string, endDate: string, daysOfWeek: number[]): number {
  if (!startDate || !endDate || daysOfWeek.length === 0) return 0;
  const days = new Set(daysOfWeek);
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  let count = 0;
  while (current <= end) {
    if (days.has(current.getUTCDay())) count++;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

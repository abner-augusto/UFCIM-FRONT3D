import { campusNow } from '@/utils/date';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, type TimeSlot } from '@/types/reservation';

export type PeriodKey = TimeSlot;

export const PERIOD_LABELS = TIME_SLOT_LABELS;

const PERIOD_ORDER: PeriodKey[] = ['morning', 'afternoon', 'evening'];

const hourOf = (time: string) => Number(time.slice(0, 2));

export function getCurrentPeriod(): PeriodKey {
  const hour = campusNow().hour;
  for (const period of PERIOD_ORDER) {
    if (hour < hourOf(TIME_SLOT_RANGES[period].endTime)) return period;
  }
  return 'morning';
}

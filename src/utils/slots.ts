import type { AvailabilitySlot } from '@/types/reservation';

/**
 * Half-hour scheduling (MEL-024). The backend returns availability in
 * `SLOT_MINUTES` slots and rejects reservations, series and blockings shorter
 * than `MIN_DURATION_MINUTES`; the UI only ever offers ranges that pass both.
 */
export const SLOT_MINUTES = 30;
export const MIN_DURATION_MINUTES = 60;

const DAY_MINUTES = 24 * 60;
const DEFAULT_CLOSED_FROM = '22:00';
const DEFAULT_CLOSED_TO = '07:00';

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Short pt-BR label: `16:00` → `16h`, `16:30` → `16h30`. */
export function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(':');
  return minutes === '00' ? `${hours}h` : `${hours}h${minutes}`;
}

/** Start (`HH:MM`) of the half-hour slot that contains `moment`, in local time. */
export function slotStartAt(moment: Date): string {
  const minutes = moment.getHours() * 60 + moment.getMinutes();
  return minutesToTime(Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES);
}

function durationOf(slot: TimeRange): number {
  return timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
}

/**
 * End times of the bookable run that starts at `slots[index]`, following
 * contiguous slots only (a gap such as hidden closed hours ends the run).
 */
function runEnds(
  slots: AvailabilitySlot[],
  index: number,
  isBookable: (slot: AvailabilitySlot) => boolean,
): string[] {
  const ends: string[] = [];
  for (let i = index; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!isBookable(slot)) break;
    if (i > index && slots[i - 1].endTime !== slot.startTime) break;
    ends.push(slot.endTime);
  }
  return ends;
}

/** Starts with at least `minMinutes` of contiguous bookable time ahead. */
export function buildStartOptions(
  slots: AvailabilitySlot[],
  isBookable: (slot: AvailabilitySlot) => boolean,
  minMinutes: number = MIN_DURATION_MINUTES,
): string[] {
  return slots
    .filter((slot, index) => {
      const ends = runEnds(slots, index, isBookable);
      const last = ends[ends.length - 1];
      return !!last && timeToMinutes(last) - timeToMinutes(slot.startTime) >= minMinutes;
    })
    .map((slot) => slot.startTime);
}

/** Valid ends for `startTime`: at least `minMinutes` later, with no conflict in between. */
export function buildEndOptions(
  slots: AvailabilitySlot[],
  startTime: string,
  isBookable: (slot: AvailabilitySlot) => boolean,
  minMinutes: number = MIN_DURATION_MINUTES,
): string[] {
  const index = slots.findIndex((slot) => slot.startTime === startTime);
  if (index === -1) return [];
  const start = timeToMinutes(startTime);
  return runEnds(slots, index, isBookable).filter((end) => timeToMinutes(end) - start >= minMinutes);
}

/** Available slots of `step` minutes covering [from, to). */
export function buildOpenSlots(from: string, to: string, step: number = SLOT_MINUTES): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const end = timeToMinutes(to);
  for (let minutes = timeToMinutes(from); minutes < end; minutes += step) {
    slots.push({
      startTime: minutesToTime(minutes),
      endTime: minutesToTime(Math.min(minutes + step, end)),
      status: 'available',
    });
  }
  return slots;
}

/**
 * Half-hour slots of a space's opening hours, from its closed hours
 * (`closedFrom`/`closedTo`, overnight by default: 22:00–07:00).
 */
export function openingSlots(closedFrom?: string | null, closedTo?: string | null): AvailabilitySlot[] {
  const from = timeToMinutes(closedFrom || DEFAULT_CLOSED_FROM);
  const to = timeToMinutes(closedTo || DEFAULT_CLOSED_TO);
  const isClosed = (minutes: number) => {
    if (from === to) return true;
    if (from < to) return minutes >= from && minutes < to;
    return minutes >= from || minutes < to;
  };
  return buildOpenSlots('00:00', minutesToTime(DAY_MINUTES)).filter(
    (slot) => !isClosed(timeToMinutes(slot.startTime)),
  );
}

/** One room-popup cell per hour, built from its half-hour slots. */
export interface HourCell extends AvailabilitySlot {
  /** The slots inside this hour, in order (two for half-hour data). */
  halves: AvailabilitySlot[];
  /** True when the halves differ in status: the cell shows a split fill. */
  split: boolean;
}

function aggregateStatus(halves: AvailabilitySlot[]): AvailabilitySlot {
  if (halves.some((half) => half.status === 'available')) {
    return { ...halves[0], status: 'available', reservation: undefined, blocking: undefined };
  }
  return (
    halves.find((half) => half.status === 'blocked') ??
    halves.find((half) => half.status === 'reserved') ??
    halves[0]
  );
}

/**
 * Groups slots into hour cells (MEL-024). A cell is `available` when any half
 * is free, so a half-occupied hour stays selectable; otherwise it takes the
 * blocked or reserved half (with its detail). Legacy hourly slots map 1:1.
 */
export function groupSlotsByHour(slots: AvailabilitySlot[]): HourCell[] {
  const byHour = new Map<number, AvailabilitySlot[]>();
  for (const slot of slots) {
    const hour = Math.floor(timeToMinutes(slot.startTime) / 60);
    const bucket = byHour.get(hour);
    if (bucket) bucket.push(slot);
    else byHour.set(hour, [slot]);
  }

  return [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, halves]) => {
      const ordered = [...halves].sort((a, b) => a.startTime.localeCompare(b.startTime));
      return {
        ...aggregateStatus(ordered),
        startTime: minutesToTime(hour * 60),
        endTime: minutesToTime((hour + 1) * 60),
        halves: ordered,
        split: ordered.some((half) => half.status !== ordered[0].status),
      };
    });
}

export interface BusyInterval extends TimeRange {
  status: 'reserved' | 'blocked';
  reservation?: AvailabilitySlot['reservation'];
  blocking?: AvailabilitySlot['blocking'];
}

function bookingKey(slot: AvailabilitySlot): string {
  return `${slot.status}:${slot.reservation?.id ?? slot.blocking?.id ?? ''}`;
}

/** Reserved and blocked ranges of the day, merging consecutive slots of one booking. */
export function busyIntervals(slots: AvailabilitySlot[]): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  let previous: AvailabilitySlot | null = null;
  for (const slot of slots) {
    if (slot.status !== 'reserved' && slot.status !== 'blocked') {
      previous = null;
      continue;
    }
    const last = intervals[intervals.length - 1];
    if (previous && last && previous.endTime === slot.startTime && bookingKey(previous) === bookingKey(slot)) {
      last.endTime = slot.endTime;
    } else {
      intervals.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        ...(slot.reservation ? { reservation: slot.reservation } : {}),
        ...(slot.blocking ? { blocking: slot.blocking } : {}),
      });
    }
    previous = slot;
  }
  return intervals;
}

export interface HourOccupancy {
  hour: string;
  /** Occupied (reserved or blocked) half-hours across all rooms. */
  occupiedHalves: number;
  /** Open (bookable or occupied) half-hours across all rooms. */
  openHalves: number;
  /** Rooms with any occupied half in this hour. */
  roomsInUse: number;
  /** Rooms open during this hour. */
  rooms: number;
}

/** Per-hour occupancy across rooms for `[fromHour, toHour)`, aggregating both halves. */
export function hourlyRoomOccupancy(
  rooms: AvailabilitySlot[][],
  fromHour: number,
  toHour: number,
): HourOccupancy[] {
  const result: HourOccupancy[] = [];
  for (let hour = fromHour; hour < toHour; hour += 1) {
    const entry: HourOccupancy = { hour: minutesToTime(hour * 60), occupiedHalves: 0, openHalves: 0, roomsInUse: 0, rooms: 0 };
    for (const slots of rooms) {
      const inHour = slots.filter(
        (slot) =>
          Math.floor(timeToMinutes(slot.startTime) / 60) === hour &&
          slot.status !== 'closed' &&
          slot.status !== 'not_reservable',
      );
      if (!inHour.length) continue;
      const occupied = inHour.filter((slot) => slot.status === 'reserved' || slot.status === 'blocked');
      // Weight by duration so legacy hourly slots count as two halves.
      const halvesOf = (list: AvailabilitySlot[]) =>
        list.reduce((sum, slot) => sum + durationOf(slot) / SLOT_MINUTES, 0);
      entry.openHalves += halvesOf(inHour);
      entry.occupiedHalves += halvesOf(occupied);
      entry.rooms += 1;
      if (occupied.length) entry.roomsInUse += 1;
    }
    result.push(entry);
  }
  return result;
}

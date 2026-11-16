import type { Reservation } from '@/types/reservation';
import type { RequesterSelection } from '@/utils/reservation-requester';

export interface ScheduleSelection {
  date: string;
  startTime: string;
  endTime: string;
}

export interface PurposeSelection {
  purpose: string;
  description: string;
}

export interface ReservationTrayDirtyInput {
  reservationMode: 'single' | 'recurring';
  recurringDirty: boolean;
  isEditing: boolean;
  editingReservation?: Reservation | null;
  pendingUpdate: unknown;
  confirmStatus: string;
  currentStep: string;
  baselineSchedule: ScheduleSelection | null | undefined;
  selectedSchedule: ScheduleSelection | null;
  selectedPurpose: PurposeSelection;
  selectedRequester: RequesterSelection;
}

export interface RecurringDirtyInput {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  seriesStart: string;
  seriesEnd: string;
  description: string;
  requester: RequesterSelection;
  successMsg: string | null;
}

export function schedulesEqual(
  a: ScheduleSelection | null | undefined,
  b: ScheduleSelection | null | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime;
}

export function resolveScheduleBaseline(
  current: ScheduleSelection | null | undefined,
  incoming: ScheduleSelection | null,
): ScheduleSelection | null {
  return current === undefined ? incoming : current;
}

export function hasRequesterInput(requester: RequesterSelection): boolean {
  return requester.user !== null || requester.query !== '' || requester.contact !== '';
}

export function isRecurringFormDirty(input: RecurringDirtyInput): boolean {
  if (input.successMsg) return false;
  const textFields = [input.startDate, input.endDate, input.seriesStart, input.seriesEnd, input.description];
  return textFields.some(Boolean) || input.daysOfWeek.length > 0 || hasRequesterInput(input.requester);
}

export function isReservationTrayDirty(input: ReservationTrayDirtyInput): boolean {
  if (input.confirmStatus === 'submitting' || input.confirmStatus === 'success' || input.currentStep === 'success') {
    return false;
  }
  if (input.reservationMode === 'recurring') return input.recurringDirty;
  if (input.isEditing) {
    return !!input.pendingUpdate || input.selectedPurpose.description !== (input.editingReservation?.description ?? '');
  }
  const scheduleDirty =
    input.baselineSchedule !== undefined && !schedulesEqual(input.selectedSchedule, input.baselineSchedule);
  const purposeDirty = input.selectedPurpose.purpose !== '' || input.selectedPurpose.description !== '';
  return scheduleDirty || purposeDirty || hasRequesterInput(input.selectedRequester);
}

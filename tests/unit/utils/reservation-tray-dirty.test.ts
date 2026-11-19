import { describe, expect, it } from 'vitest';
import {
  hasRequesterInput,
  isRecurringFormDirty,
  isReservationTrayDirty,
  resolveScheduleBaseline,
  schedulesEqual,
} from '@/utils/reservation-tray-dirty';
import { emptyRequester } from '@/utils/reservation-requester';

const BASE_SCHEDULE = { date: '2026-09-02', startTime: '10:30', endTime: '12:00' };

function baseTrayInput() {
  return {
    reservationMode: 'single' as const,
    recurringDirty: false,
    isEditing: false,
    editingReservation: null,
    pendingUpdate: null,
    confirmStatus: 'idle',
    currentStep: 'schedule',
    baselineSchedule: BASE_SCHEDULE,
    selectedSchedule: BASE_SCHEDULE,
    selectedPurpose: { purpose: '', description: '' },
    selectedRequester: emptyRequester(),
  };
}

describe('reservation-tray-dirty', () => {
  it('compares schedules and resolves baseline once', () => {
    expect(schedulesEqual(null, null)).toBe(true);
    expect(schedulesEqual(BASE_SCHEDULE, null)).toBe(false);
    expect(schedulesEqual(BASE_SCHEDULE, { ...BASE_SCHEDULE })).toBe(true);
    expect(schedulesEqual(BASE_SCHEDULE, { ...BASE_SCHEDULE, endTime: '12:30' })).toBe(false);

    expect(resolveScheduleBaseline(undefined, BASE_SCHEDULE)).toEqual(BASE_SCHEDULE);
    expect(resolveScheduleBaseline(BASE_SCHEDULE, { ...BASE_SCHEDULE, startTime: '14:00' })).toEqual(BASE_SCHEDULE);
  });

  it('treats untouched create tray as clean even with prefilled schedule', () => {
    expect(isReservationTrayDirty(baseTrayInput())).toBe(false);
    expect(isReservationTrayDirty({ ...baseTrayInput(), baselineSchedule: undefined, selectedSchedule: null })).toBe(false);
  });

  it('detects schedule, purpose, description, and requester changes in create mode', () => {
    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      selectedSchedule: { ...BASE_SCHEDULE, startTime: '14:00' },
    })).toBe(true);

    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      selectedPurpose: { purpose: 'class', description: '' },
    })).toBe(true);

    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      selectedPurpose: { purpose: '', description: 'Modelagem' },
    })).toBe(true);

    const requester = { ...emptyRequester(), query: 'Maria' };
    expect(hasRequesterInput(requester)).toBe(true);
    expect(isReservationTrayDirty({ ...baseTrayInput(), selectedRequester: requester })).toBe(true);
  });

  it('detects changes in edit mode and clears on submit/success', () => {
    const editing = {
      id: 'res-1',
      spaceId: 'sp-1',
      userId: 'u-1',
      date: '2026-09-02',
      timeSlot: 'morning',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      changeOrigin: null,
      recurrenceId: null,
      purpose: 'class',
      description: 'Original',
      cancelReason: null,
      createdAt: '',
      updatedAt: '',
    } as const;

    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      isEditing: true,
      editingReservation: editing,
      selectedPurpose: { purpose: 'class', description: 'Original' },
    })).toBe(false);

    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      isEditing: true,
      editingReservation: editing,
      selectedPurpose: { purpose: 'class', description: 'Alterado' },
    })).toBe(true);

    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      selectedPurpose: { purpose: 'class', description: 'Algo' },
      confirmStatus: 'submitting',
    })).toBe(false);

    expect(isReservationTrayDirty({
      ...baseTrayInput(),
      selectedPurpose: { purpose: 'class', description: 'Algo' },
      currentStep: 'success',
    })).toBe(false);
  });

  it('delegates recurring mode dirty state and evaluates recurring form fields', () => {
    expect(isReservationTrayDirty({ ...baseTrayInput(), reservationMode: 'recurring', recurringDirty: true })).toBe(true);

    const cleanRecurring = {
      startDate: '',
      endDate: '',
      daysOfWeek: [],
      seriesStart: '',
      seriesEnd: '',
      description: '',
      requester: emptyRequester(),
      successMsg: null,
    };
    expect(isRecurringFormDirty(cleanRecurring)).toBe(false);
    expect(isRecurringFormDirty({ ...cleanRecurring, description: 'Semestre' })).toBe(true);
    expect(isRecurringFormDirty({ ...cleanRecurring, daysOfWeek: [1] })).toBe(true);
    expect(isRecurringFormDirty({ ...cleanRecurring, description: 'Semestre', successMsg: 'Criadas' })).toBe(false);
  });
});

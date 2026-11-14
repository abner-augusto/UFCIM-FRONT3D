import { describe, expect, it } from 'vitest';
import { inviteErrorId, validateAcceptInvite, validateEquipmentReport, validateRecurringForm, validateReservationForm } from '@/utils/form-validation';

describe('form validation', () => {
  it('checks reservation fields in order', () => {
    const valid = { reservable: true, date: '2026-01-01', schedule: true, purpose: 'class' };
    expect(validateReservationForm({ ...valid, reservable: false })?.message).toContain('não está disponível');
    expect(validateReservationForm({ ...valid, date: '' })?.id).toBe('#reservation-date');
    expect(validateReservationForm({ ...valid, schedule: false })?.id).toContain('slot-btn');
    expect(validateReservationForm({ ...valid, purpose: '' })?.id).toBe('#reservation-purpose');
    expect(validateReservationForm(valid)).toBeNull();
  });

  it('checks recurring fields in order', () => {
    const valid = { reservable: true, startDate: '2026-01-01', endDate: '2026-02-01', occurrences: 1, start: '08:00', hasRange: true, description: 'Aula' };
    expect(validateRecurringForm({ ...valid, reservable: false })?.message).toContain('não está disponível');
    expect(validateRecurringForm({ ...valid, startDate: '' })?.id).toBe('rec-start');
    expect(validateRecurringForm({ ...valid, endDate: valid.startDate })?.id).toBe('rec-end');
    expect(validateRecurringForm({ ...valid, occurrences: 0 })?.id).toBe('rec-dow-label');
    expect(validateRecurringForm({ ...valid, start: '', hasRange: false })?.id).toBe('rec-time-start');
    expect(validateRecurringForm({ ...valid, hasRange: false })?.id).toBe('rec-time-end');
    expect(validateRecurringForm({ ...valid, description: ' ' })?.id).toBe('rec-desc');
    expect(validateRecurringForm(valid)).toBeNull();
  });

  it('validates invitation fields and resolves the first error', () => {
    const valid = { student: true, registration: '123', password: 'senha123', confirmation: 'senha123' };
    expect(inviteErrorId(validateAcceptInvite({ ...valid, registration: ' ' }))).toBe('invite-registration');
    expect(inviteErrorId(validateAcceptInvite({ ...valid, password: 'short' }))).toBe('invite-password');
    expect(validateAcceptInvite({ ...valid, password: 'abcdefgh' }).password).toContain('número');
    expect(inviteErrorId(validateAcceptInvite({ ...valid, confirmation: 'different' }))).toBe('invite-password-confirm');
    expect(validateAcceptInvite({ ...valid, student: false, registration: '' })).toEqual({});
    expect(inviteErrorId({ passwordConfirm: 'x', registration: 'x' })).toBe('invite-registration');
    expect(inviteErrorId({})).toBeUndefined();
  });

  it('checks severity before the description', () => {
    const target = { kind: 'equipment' } as const;
    expect(validateEquipmentReport(null, target, '')).toBe('report-severity-first');
    expect(validateEquipmentReport('minor', target, '')).toBe('report-desc');
    expect(validateEquipmentReport('minor', target, 'Quebrado')).toBeNull();
    expect(validateEquipmentReport('minor', { kind: 'room', category: 'lighting' }, '')).toBeNull();
  });
});

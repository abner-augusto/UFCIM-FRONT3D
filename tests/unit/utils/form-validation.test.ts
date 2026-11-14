import { describe, expect, it } from 'vitest';
import { invitationSecurityError, requesterSearchStatus, validateAcceptInvite, validateEquipmentReport, validateRecurringForm, validateReservationForm } from '@/utils/form-validation';

describe('form validation', () => {
  it('reports missing security configuration before a missing token', () => {
    expect(invitationSecurityError('', '')).toContain('não está configurada');
    expect(invitationSecurityError('key', '')).toContain('complete');
    expect(invitationSecurityError('key', 'token')).toBeNull();
  });

  it('announces the current requester search status', () => {
    expect(requesterSearchStatus(false, false, false, 0, 0)).toBe('');
    expect(requesterSearchStatus(true, true, false, 0, 0)).toContain('Buscando');
    expect(requesterSearchStatus(true, false, true, 0, 0)).toContain('Não foi possível');
    expect(requesterSearchStatus(true, false, false, 0, 0)).toContain('Ninguém');
    expect(requesterSearchStatus(true, false, false, 6, 7)).toContain('refinar');
    expect(requesterSearchStatus(true, false, false, 1, 1)).toBe('');
  });
  it('checks reservation fields in order', () => {
    const valid = { date: '2026-01-01', schedule: true, purpose: 'class' };
    expect(validateReservationForm({ ...valid, date: '' })?.field).toBe('date');
    expect(validateReservationForm({ ...valid, schedule: false })?.field).toBe('schedule');
    expect(validateReservationForm({ ...valid, purpose: '' })?.field).toBe('purpose');
    expect(validateReservationForm(valid)).toBeNull();
  });

  it('checks recurring fields in order', () => {
    const valid = { startDate: '2026-01-01', endDate: '2026-02-01', occurrences: 1, start: '08:00', hasRange: true, description: 'Aula' };
    expect(validateRecurringForm({ ...valid, startDate: '' })?.field).toBe('startDate');
    expect(validateRecurringForm({ ...valid, endDate: valid.startDate })?.field).toBe('endDate');
    expect(validateRecurringForm({ ...valid, occurrences: 0 })?.field).toBe('weekdays');
    expect(validateRecurringForm({ ...valid, start: '', hasRange: false })?.field).toBe('start');
    expect(validateRecurringForm({ ...valid, hasRange: false })?.field).toBe('end');
    expect(validateRecurringForm({ ...valid, description: ' ' })?.field).toBe('description');
    expect(validateRecurringForm(valid)).toBeNull();
  });

  it('validates invitation fields in order', () => {
    const valid = { student: true, registration: '123', password: 'senha123', confirmation: 'senha123' };
    expect(validateAcceptInvite({ ...valid, registration: ' ' })?.field).toBe('registration');
    expect(validateAcceptInvite({ ...valid, password: 'short' })?.field).toBe('password');
    expect(validateAcceptInvite({ ...valid, password: 'abcdefgh' })?.message).toContain('número');
    expect(validateAcceptInvite({ ...valid, confirmation: 'different' })?.field).toBe('passwordConfirm');
    expect(validateAcceptInvite({ ...valid, student: false, registration: '' })).toBeNull();
  });

  it('checks severity before the description', () => {
    const target = { kind: 'equipment' } as const;
    expect(validateEquipmentReport(null, target, '')?.field).toBe('severity');
    expect(validateEquipmentReport('minor', target, '')?.field).toBe('description');
    expect(validateEquipmentReport('minor', target, 'Quebrado')).toBeNull();
    expect(validateEquipmentReport('minor', { kind: 'room', category: 'lighting' }, '')).toBeNull();
  });
});

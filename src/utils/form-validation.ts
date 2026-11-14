import { isTicketDescriptionValid, type TicketTarget } from './maintenance-tickets';

export interface FormError { id: string; message: string }

export function validateReservationForm(input: { reservable?: boolean; date: string; schedule: boolean; purpose: string }): FormError | null {
  if (input.reservable === false) return { id: '', message: 'Este espaço não está disponível para reserva.' };
  if (!input.date) return { id: '#reservation-date', message: 'Selecione uma data.' };
  if (!input.schedule) return { id: '.slot-btn:not(:disabled), #reservation-start', message: 'Selecione um período ou horário.' };
  if (!input.purpose) return { id: '#reservation-purpose', message: 'Selecione uma finalidade.' };
  return null;
}

export function validateRecurringForm(input: { reservable?: boolean; startDate: string; endDate: string; occurrences: number; start: string; hasRange: boolean; description: string }): FormError | null {
  if (input.reservable === false) return { id: 'rec-start', message: 'Este espaço não está disponível para reserva.' };
  if (!input.startDate) return { id: 'rec-start', message: 'Selecione a data de início.' };
  if (!input.endDate || input.endDate <= input.startDate) return { id: 'rec-end', message: 'Selecione uma data de fim posterior ao início.' };
  if (!input.occurrences) return { id: 'rec-dow-label', message: 'Selecione dias da semana com ocorrências no período.' };
  if (!input.hasRange) return { id: input.start ? 'rec-time-end' : 'rec-time-start', message: 'Selecione o horário.' };
  if (!input.description.trim()) return { id: 'rec-desc', message: 'Informe a descrição da recorrência.' };
  return null;
}

export function validateAcceptInvite(input: { student: boolean; registration: string; password: string; confirmation: string }): Record<string, string> {
  if (input.student && !input.registration.trim()) return { registration: 'A matrícula é obrigatória para alunos.' };
  if (input.password.length < 8) return { password: 'A senha deve ter ao menos 8 caracteres.' };
  if (!/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) return { password: 'A senha deve conter ao menos uma letra e um número.' };
  if (input.password !== input.confirmation) return { passwordConfirm: 'As senhas não coincidem.' };
  return {};
}

export function inviteErrorId(errors: Record<string, string>): string | undefined {
  const field = ['registration', 'password', 'passwordConfirm'].find((key) => errors[key]);
  if (!field) return undefined;
  return field === 'passwordConfirm' ? 'invite-password-confirm' : `invite-${field}`;
}

export function validateEquipmentReport(severity: string | null, target: TicketTarget, description: string): string | null {
  if (severity === null) return 'report-severity-first';
  if (!isTicketDescriptionValid(target, description)) return 'report-desc';
  return null;
}

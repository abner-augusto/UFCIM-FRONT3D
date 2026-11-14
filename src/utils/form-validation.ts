import { isTicketDescriptionValid, type TicketTarget } from './maintenance-tickets';

export interface FormError<Field extends string = string> {
  field: Field;
  message: string;
}

export function invitationSecurityError(siteKey: string, token: string): string | null {
  if (!siteKey) return 'A verificação de segurança não está configurada. Entre em contato com o suporte.';
  if (!token) return 'Por favor, complete a verificação de segurança.';
  return null;
}

export function requesterSearchStatus(active: boolean, searching: boolean, failed: boolean, count: number, total: number): string {
  if (!active) return '';
  if (searching) return 'Buscando…';
  if (failed) return 'Não foi possível buscar agora. O nome digitado será usado.';
  if (!count) return 'Ninguém cadastrado com esse nome. O nome digitado será usado.';
  return total > count ? 'Continue digitando para refinar a busca.' : '';
}

export function validateReservationForm(input: {
  date: string;
  schedule: boolean;
  purpose: string;
}): FormError<'date' | 'schedule' | 'purpose'> | null {
  if (!input.date) return { field: 'date', message: 'Selecione uma data.' };
  if (!input.schedule) return { field: 'schedule', message: 'Selecione um período ou horário.' };
  if (!input.purpose) return { field: 'purpose', message: 'Selecione uma finalidade.' };
  return null;
}

export function validateRecurringForm(input: {
  startDate: string;
  endDate: string;
  occurrences: number;
  start: string;
  hasRange: boolean;
  description: string;
}): FormError<'startDate' | 'endDate' | 'weekdays' | 'start' | 'end' | 'description'> | null {
  if (!input.startDate) return { field: 'startDate', message: 'Selecione a data de início.' };
  if (!input.endDate || input.endDate <= input.startDate) return { field: 'endDate', message: 'Selecione uma data de fim posterior ao início.' };
  if (!input.occurrences) return { field: 'weekdays', message: 'Selecione dias da semana com ocorrências no período.' };
  if (!input.hasRange) return { field: input.start ? 'end' : 'start', message: 'Selecione o horário.' };
  if (!input.description.trim()) return { field: 'description', message: 'Informe a descrição da recorrência.' };
  return null;
}

export function validateAcceptInvite(input: {
  student: boolean;
  registration: string;
  password: string;
  confirmation: string;
}): FormError<'registration' | 'password' | 'passwordConfirm'> | null {
  if (input.student && !input.registration.trim()) return { field: 'registration', message: 'A matrícula é obrigatória para alunos.' };
  if (input.password.length < 8) return { field: 'password', message: 'A senha deve ter ao menos 8 caracteres.' };
  if (!/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) return { field: 'password', message: 'A senha deve conter ao menos uma letra e um número.' };
  if (input.password !== input.confirmation) return { field: 'passwordConfirm', message: 'As senhas não coincidem.' };
  return null;
}

export function validateEquipmentReport(
  severity: string | null,
  target: TicketTarget,
  description: string,
): FormError<'severity' | 'description'> | null {
  if (severity === null) return { field: 'severity', message: 'Selecione a gravidade.' };
  if (!isTicketDescriptionValid(target, description)) return { field: 'description', message: 'Mínimo de 5 caracteres' };
  return null;
}

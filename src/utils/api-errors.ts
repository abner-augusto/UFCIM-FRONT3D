import { ApiError } from '@/services/api';

export function mapLoginError(e: unknown): string {
  if (!(e instanceof ApiError)) {
    return 'Não foi possível conectar ao servidor.';
  }
  const msg = e.message ?? '';
  if (msg.includes('desativada')) return 'Conta desativada. Entre em contato com o administrador.';
  if (msg.includes('bloqueada')) return 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.';
  if (msg.includes('Credenciais') || e.code === 'UNAUTHORIZED') return 'Credenciais inválidas.';
  if (e.code === 'RATE_LIMITED') return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  return 'Erro ao entrar. Tente novamente.';
}

export function mapAcceptError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Não foi possível conectar ao servidor.';
  if (e.code === 'VALIDATION_ERROR' && e.details?.length) {
    return e.details[0].message;
  }
  if (e.message?.includes('inválido') || e.message?.includes('expirado')) {
    return 'Convite inválido ou expirado.';
  }
  return 'Erro ao criar conta. Tente novamente.';
}

export function mapGenericError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Não foi possível conectar ao servidor.';
  if (e.code === 'RATE_LIMITED') return 'Muitas requisições. Aguarde um momento.';
  if (e.status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
  return e.message || 'Erro inesperado.';
}

import { describe, expect, it } from 'vitest';
import { ApiError } from '@/services/api';
import { acceptFieldErrors, mapReportError } from '@/utils/api-errors';

describe('API error mapping', () => {
  it('maps report errors and preserves the server message', () => {
    expect(mapReportError(new Error())).toBe('Erro ao enviar. Tente novamente.');
    expect(mapReportError(new ApiError(409, ''))).toContain('Já existe');
    expect(mapReportError(new ApiError(400, ''))).toBe('Erro ao enviar');
    expect(mapReportError(new ApiError(409, 'Mensagem'))).toBe('Mensagem');
  });
  it('maps invitation field errors', () => {
    expect(acceptFieldErrors(new Error())).toBeNull();
    expect(acceptFieldErrors(new ApiError(400, ''))).toBeNull();
    expect(acceptFieldErrors(new ApiError(400, '', '', [{ field: 'password', message: 'Inválida' }]))).toEqual({ password: 'Inválida' });
  });
});

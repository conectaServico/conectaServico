import { describe, expect, it } from 'vitest';
import { isRequestFull, requestExpiresAt, timeLeftLabel, REQUEST_LIFETIME_DAYS } from './requestLifecycle';

const H = 60 * 60 * 1000;
const D = 24 * H;

describe('requestLifecycle', () => {
  it('o pedido sai do ar 3 dias depois de criado', () => {
    expect(REQUEST_LIFETIME_DAYS).toBe(3);
    expect(requestExpiresAt(1000)).toBe(1000 + 3 * D);
  });

  it('fica completo no 3º profissional', () => {
    expect(isRequestFull(undefined)).toBe(false);
    expect(isRequestFull(2)).toBe(false);
    expect(isRequestFull(3)).toBe(true);
  });

  it('mostra o tempo que falta em português', () => {
    const t0 = 1_000_000;
    expect(timeLeftLabel(t0, t0)).toBe('3 dias');
    expect(timeLeftLabel(t0, t0 + D + 4 * H)).toBe('1 dia e 20 h');
    expect(timeLeftLabel(t0, t0 + 3 * D - 5 * H)).toBe('5 h');
    expect(timeLeftLabel(t0, t0 + 3 * D - 10 * 60 * 1000)).toBe('menos de 1 h');
    expect(timeLeftLabel(t0, t0 + 4 * D)).toBe('encerrando');
  });
});

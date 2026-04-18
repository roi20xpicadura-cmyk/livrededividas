import { describe, it, expect } from 'vitest';
import { canSubmitTransaction, resolveOrigin } from './transactionValidation';

describe('canSubmitTransaction', () => {
  it('rejeita amount vazio', () => {
    expect(canSubmitTransaction({ amount: '', description: 'Almoço' })).toBe(false);
  });
  it('rejeita amount zero ou negativo', () => {
    expect(canSubmitTransaction({ amount: '0', description: 'x' })).toBe(false);
    expect(canSubmitTransaction({ amount: '-10', description: 'x' })).toBe(false);
  });
  it('rejeita descrição vazia ou só espaços', () => {
    expect(canSubmitTransaction({ amount: '10', description: '' })).toBe(false);
    expect(canSubmitTransaction({ amount: '10', description: '   ' })).toBe(false);
  });
  it('rejeita amount não-numérico', () => {
    expect(canSubmitTransaction({ amount: 'abc', description: 'x' })).toBe(false);
  });
  it('aceita draft válido', () => {
    expect(canSubmitTransaction({ amount: '12.5', description: 'Café' })).toBe(true);
  });
});

describe('resolveOrigin', () => {
  it('forceOrigin sempre vence', () => {
    expect(resolveOrigin('both', 'personal', 'business')).toBe('business');
    expect(resolveOrigin('business', 'business', 'personal')).toBe('personal');
  });
  it('profileType=business força business', () => {
    expect(resolveOrigin('business', 'personal')).toBe('business');
  });
  it('profileType=both respeita escolha do usuário', () => {
    expect(resolveOrigin('both', 'business')).toBe('business');
    expect(resolveOrigin('both', 'personal')).toBe('personal');
  });
  it('profileType=personal sempre personal', () => {
    expect(resolveOrigin('personal', 'business')).toBe('personal');
  });
});

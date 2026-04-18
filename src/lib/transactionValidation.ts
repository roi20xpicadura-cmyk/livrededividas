// Pure validation helpers para criação de transação.
// Extraídos pra facilitar testes unitários sem montar o componente inteiro.

export interface TransactionDraft {
  amount: string;
  description: string;
  category?: string;
  date?: string;
  type?: 'income' | 'expense';
}

/** Validação mínima usada pelo NewTransactionSheet (botão "Salvar"). */
export function canSubmitTransaction(draft: TransactionDraft): boolean {
  const n = parseFloat(draft.amount);
  return Number.isFinite(n) && n > 0 && !!draft.description?.trim();
}

/** Resolve a origin final respeitando forceOrigin > profileType. */
export function resolveOrigin(
  profileType: string,
  origin: 'personal' | 'business',
  forceOrigin?: 'personal' | 'business',
): 'personal' | 'business' {
  if (forceOrigin) return forceOrigin;
  if (profileType === 'business') return 'business';
  if (profileType === 'both') return origin;
  return 'personal';
}

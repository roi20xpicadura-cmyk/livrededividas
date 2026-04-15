export const PLAN_LIMITS = {
  free: {
    transactions_per_month: 50,
    goals: 2,
    cards: 1,
    investments: 2,
    dre: false,
    export: false,
    advanced_charts: false,
    budget: false,
    ai_chat: false,
    recurring: false,
  },
  pro: {
    transactions_per_month: Infinity,
    goals: Infinity,
    cards: Infinity,
    investments: Infinity,
    dre: true,
    export: true,
    advanced_charts: true,
    budget: true,
    ai_chat: true,
    recurring: true,
  },
  business: {
    transactions_per_month: Infinity,
    goals: Infinity,
    cards: Infinity,
    investments: Infinity,
    dre: true,
    export: true,
    advanced_charts: true,
    budget: true,
    ai_chat: true,
    recurring: true,
    multi_company: true,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function formatCurrency(val: number, currency = 'R$') {
  const trimmed = currency.trim();
  const code = trimmed === '$' ? 'USD' : 'BRL';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(val);
}

export function formatPercent(val: number) {
  return `${val.toFixed(1)}%`;
}

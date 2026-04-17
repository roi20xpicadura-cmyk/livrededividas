export type Plan = 'free' | 'pro' | 'business';

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    color: '#6B7280',
    limits: {
      transactions_per_month: 50,
      goals: 2,
      budgets: 3,
      cards: 1,
      investments: 2,
    },
    features: {
      dashboard_basic: true,
      open_finance: true,
      kora_ia: false,
      whatsapp_ia: false,
      debts: false,
      simulator: false,
      monthly_report: false,
      whatsapp_notifications: false,
      business_transactions: false,
      dre: false,
      advanced_reports: false,
      advanced_charts: false,
      budget: false,
      export: false,
      recurring: false,
      ai_chat: false,
      priority_support: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 19.90,
    color: '#7C3AED',
    limits: {
      transactions_per_month: Infinity,
      goals: Infinity,
      budgets: Infinity,
      cards: Infinity,
      investments: Infinity,
    },
    features: {
      dashboard_basic: true,
      open_finance: true,
      kora_ia: true,
      whatsapp_ia: true,
      debts: true,
      simulator: true,
      monthly_report: true,
      whatsapp_notifications: true,
      business_transactions: false,
      dre: false,
      advanced_reports: false,
      advanced_charts: true,
      budget: true,
      export: true,
      recurring: true,
      ai_chat: true,
      priority_support: false,
    },
  },
  business: {
    name: 'Business',
    price: 59,
    color: '#2563EB',
    limits: {
      transactions_per_month: Infinity,
      goals: Infinity,
      budgets: Infinity,
      cards: Infinity,
      investments: Infinity,
    },
    features: {
      dashboard_basic: true,
      open_finance: true,
      kora_ia: true,
      whatsapp_ia: true,
      debts: true,
      simulator: true,
      monthly_report: true,
      whatsapp_notifications: true,
      business_transactions: true,
      dre: true,
      advanced_reports: true,
      advanced_charts: true,
      budget: true,
      export: true,
      recurring: true,
      ai_chat: true,
      priority_support: true,
    },
  },
} as const;

// ─── BENEFÍCIOS EXIBIDOS NA UI (single source of truth) ────────────
// Lista os benefícios em linguagem amigável para mostrar nos cards de preço.
// Mantenha sincronizado com `features` acima.
export const PLAN_BENEFITS: Record<Plan, {
  tagline: string;
  items: { label: string; included: boolean }[];
}> = {
  free: {
    tagline: 'Para começar a organizar suas finanças',
    items: [
      { label: 'Até 50 lançamentos por mês', included: true },
      { label: 'Até 2 metas financeiras', included: true },
      { label: '1 cartão de crédito', included: true },
      { label: 'Até 2 investimentos', included: true },
      { label: 'Dashboard com score financeiro', included: true },
      { label: 'Open Finance (conexão com bancos)', included: true },
      { label: 'App mobile (PWA)', included: true },
      { label: 'Suporte por e-mail', included: true },
      { label: 'Kora IA no app e WhatsApp', included: false },
      { label: 'Controle de dívidas e simulador', included: false },
      { label: 'Orçamentos e categorias', included: false },
      { label: 'Exportação CSV / PDF', included: false },
      { label: 'Relatório mensal automático', included: false },
    ],
  },
  pro: {
    tagline: 'Para quem leva a vida financeira a sério',
    items: [
      { label: 'Lançamentos ilimitados', included: true },
      { label: 'Metas, cartões e investimentos ilimitados', included: true },
      { label: 'Kora IA completa (app + WhatsApp)', included: true },
      { label: 'Controle de dívidas e simulador', included: true },
      { label: 'Orçamentos por categoria', included: true },
      { label: 'Lançamentos recorrentes', included: true },
      { label: 'Gráficos e previsões avançadas', included: true },
      { label: 'Exportação CSV / PDF', included: true },
      { label: 'Relatório mensal automático', included: true },
      { label: 'Notificações inteligentes via WhatsApp', included: true },
      { label: 'Open Finance ilimitado', included: true },
    ],
  },
  business: {
    tagline: 'Para empreendedores e pequenas empresas',
    items: [
      { label: 'Tudo do plano Pro', included: true },
      { label: 'Separação de finanças PJ + PF', included: true },
      { label: 'DRE completo automatizado', included: true },
      { label: 'Relatórios avançados personalizados', included: true },
      { label: 'Lançamentos marcados como business', included: true },
      { label: 'Suporte prioritário', included: true },
      { label: 'Onboarding personalizado', included: true },
    ],
  },
};

export type FeatureKey = keyof typeof PLANS.free.features;
export type LimitKey = keyof typeof PLANS.free.limits;

export function hasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLANS[plan]?.features[feature] ?? false;
}

export function getLimit(plan: Plan, limit: LimitKey): number {
  return PLANS[plan]?.limits[limit] ?? 0;
}

// Backwards-compat (older imports)
export const PLAN_LIMITS = {
  free: { ...PLANS.free.limits, ...PLANS.free.features },
  pro: { ...PLANS.pro.limits, ...PLANS.pro.features },
  business: { ...PLANS.business.limits, ...PLANS.business.features },
} as const;

export type PlanType = Plan;

export function formatCurrency(val: number, currency = 'R$') {
  const trimmed = currency.trim();
  const code = trimmed === '$' ? 'USD' : 'BRL';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(val);
}

export function formatPercent(val: number) {
  return `${val.toFixed(1)}%`;
}

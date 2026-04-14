import { useProfile } from '@/hooks/useProfile';

const LIMITS = {
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
    bank_connection: false,
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
    bank_connection: true,
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
    bank_connection: true,
  },
} as const;

type PlanKey = keyof typeof LIMITS;
type FeatureKey = keyof typeof LIMITS['free'];

export function usePlan() {
  const { profile } = useProfile();
  const plan = ((profile?.plan || 'free') as PlanKey);
  const current = LIMITS[plan] || LIMITS.free;

  const canDo = (feature: FeatureKey): boolean => {
    const val = current[feature];
    if (typeof val === 'boolean') return val;
    return val === Infinity;
  };

  const hasReached = (feature: FeatureKey, count: number): boolean => {
    const limit = current[feature];
    if (typeof limit === 'boolean' || limit === Infinity) return false;
    return count >= limit;
  };

  const getLimit = (feature: FeatureKey) => current[feature];

  return { plan, canDo, hasReached, getLimit, limits: current };
}

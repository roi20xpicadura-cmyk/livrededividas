import { useProfile } from '@/hooks/useProfile';
import { PLANS, hasFeature, getLimit, type Plan, type FeatureKey, type LimitKey } from '@/lib/plans';

export function usePlan() {
  const { profile, loading } = useProfile();
  const plan = ((profile?.plan as Plan) || 'free') as Plan;
  const planInfo = PLANS[plan] || PLANS.free;

  const canDo = (feature: FeatureKey): boolean => hasFeature(plan, feature);

  const hasReached = (limit: LimitKey, count: number): boolean => {
    const max = getLimit(plan, limit);
    if (max === Infinity) return false;
    return count >= max;
  };

  return {
    plan,
    loading,
    planInfo,
    isFree: plan === 'free',
    isPro: plan === 'pro' || plan === 'business',
    isBusiness: plan === 'business',
    canDo,
    hasFeature: canDo,
    hasReached,
    getLimit: (l: LimitKey) => getLimit(plan, l),
    limits: planInfo.limits,
  };
}

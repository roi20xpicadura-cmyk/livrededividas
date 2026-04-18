import { useProfile } from '@/hooks/useProfile';
import { PricingCards } from '@/pages/LandingPage';
import { PLAN_LIMITS, PlanType } from '@/lib/plans';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BillingPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const [txCount, setTxCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [invCount, setInvCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('credit_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([tx, g, c, i]) => {
      setTxCount(tx.count || 0);
      setGoalCount(g.count || 0);
      setCardCount(c.count || 0);
      setInvCount(i.count || 0);
    });
  }, [user]);

  const HOTMART_LINKS: Record<string, string> = {
    pro: 'https://pay.hotmart.com/S105430199N?off=p5itoui4&checkoutMode=6',
    business: 'https://pay.hotmart.com/S105430199N?off=ir7ki0tu',
  };

  const handleUpgrade = async (planName: string) => {
    const key = planName.toLowerCase();
    const url = HOTMART_LINKS[key];
    if (!url) {
      toast.info('Plano indisponível no momento.');
      return;
    }

    // Abre o checkout sem expor o email do usuário na URL (evita vazamento
    // via histórico do navegador, logs de servidor intermediário e Referer).
    // Se necessário, o usuário preenche o email na própria página da Hotmart.
    // O vínculo com o perfil acontece no webhook via email recebido da Hotmart.
    const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
    if (!popup) {
      toast.error('Permita pop-ups para continuar o pagamento.');
      return;
    }
    popup.location.href = url;
  };

  const limits = PLAN_LIMITS[plan];
  const meters = [
    { label: 'Lançamentos', used: txCount, max: limits.transactions_per_month },
    { label: 'Metas', used: goalCount, max: limits.goals },
    { label: 'Cartões', used: cardCount, max: limits.cards },
    { label: 'Investimentos', used: invCount, max: limits.investments },
  ];

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl px-0 pb-4">
      {/* Current Plan */}
      <div className="card-surface p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[13px] font-extrabold text-fin-green-dark">Plano Atual</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${plan === 'pro' ? 'bg-primary text-primary-foreground' : plan === 'business' ? 'bg-fin-purple text-white' : 'bg-secondary text-secondary-foreground'}`}>
            {plan.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-fin-green-pale text-fin-green text-[10px] font-bold">Ativo</span>
        </div>

        {plan === 'free' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {meters.map(m => {
              const pct = m.max === Infinity ? 0 : Math.min((m.used / m.max) * 100, 100);
              return (
                <div key={m.label} className="p-3 bg-fin-green-pale rounded-lg">
                  <p className="label-upper text-muted">{m.label}</p>
                  <p className="text-sm metric-value text-foreground">{m.used}/{m.max === Infinity ? '∞' : m.max}</p>
                  <div className="mt-1 h-1.5 bg-fin-green-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-fin-red' : 'bg-fin-green'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <PricingCards currentPlan={plan} onUpgrade={handleUpgrade} compact />

      {/* Invoice History Placeholder */}
      <div className="card-surface p-4 md:p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Histórico de Faturas</h2>
        <p className="text-sm text-muted">Nenhuma fatura disponível.</p>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, ArrowRight, X, Sparkles, ReceiptText, Target, CreditCard, Landmark, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Step {
  key: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  route: string;
  color: string;
}

const STEPS: Step[] = [
  { key: 'transaction', icon: ReceiptText, title: 'Adicione seu primeiro lançamento', desc: 'Registre uma receita ou despesa para começar a acompanhar suas finanças.', route: '/app/transactions', color: '#16a34a' },
  { key: 'goal', icon: Target, title: 'Crie uma meta financeira', desc: 'Defina quanto quer economizar e acompanhe seu progresso dia a dia.', route: '/app/goals', color: '#7c3aed' },
  { key: 'card', icon: CreditCard, title: 'Cadastre um cartão de crédito', desc: 'Controle seus limites, faturas e gastos no cartão.', route: '/app/cards', color: '#0891b2' },
  { key: 'budget', icon: Landmark, title: 'Defina um orçamento mensal', desc: 'Limite seus gastos por categoria e evite surpresas no fim do mês.', route: '/app/budget', color: '#ea580c' },
  { key: 'settings', icon: Settings, title: 'Personalize seu perfil', desc: 'Adicione sua foto, ajuste moeda e preferências do app.', route: '/app/settings', color: '#6366f1' },
];

export default function WelcomeChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`checklist_dismissed_${user.id}`);
    if (stored === 'true') { setDismissed(true); setLoading(false); return; }

    Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
      supabase.from('credit_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
    ]).then(([txRes, goalRes, cardRes, budgetRes, profileRes]) => {
      setCompleted({
        transaction: (txRes.count || 0) > 0,
        goal: (goalRes.count || 0) > 0,
        card: (cardRes.count || 0) > 0,
        budget: (budgetRes.count || 0) > 0,
        settings: !!profileRes.data?.avatar_url,
      });
      setLoading(false);
    });
  }, [user]);

  const completedCount = useMemo(() => Object.values(completed).filter(Boolean).length, [completed]);
  const allDone = completedCount === STEPS.length;
  const progress = (completedCount / STEPS.length) * 100;

  const handleDismiss = () => {
    if (user) localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
    setDismissed(true);
  };

  if (loading || dismissed) return null;
  if (allDone) {
    // Auto-dismiss after all steps completed
    setTimeout(handleDismiss, 3000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-weak)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: allDone ? 'var(--color-success-bg)' : 'linear-gradient(135deg, #16a34a, #0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {allDone
              ? <Check size={18} color="#16a34a" />
              : <Sparkles size={18} color="white" />
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)', margin: 0 }}>
              {allDone ? 'Tudo pronto! 🎉' : 'Primeiros passos'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: 0 }}>
              {allDone ? 'Você completou todas as etapas' : `${completedCount} de ${STEPS.length} concluídos`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Progress circle */}
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-border-base)" strokeWidth="3" />
            <circle cx="16" cy="16" r="13" fill="none" stroke="#16a34a" strokeWidth="3"
              strokeDasharray={`${progress * 0.817} ${81.7 - progress * 0.817}`}
              strokeDashoffset="20.4" strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            <text x="16" y="16" textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: 10, fontWeight: 800, fill: 'var(--color-text-strong)' }}>
              {completedCount}
            </text>
          </svg>

          {expanded ? <ChevronUp size={16} color="var(--color-text-subtle)" /> : <ChevronDown size={16} color="var(--color-text-subtle)" />}
        </div>
      </div>

      {/* Steps list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STEPS.map((step, i) => {
                const done = completed[step.key];
                return (
                  <motion.button
                    key={step.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => !done && navigate(step.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: 'none',
                      background: done ? 'var(--color-bg-sunken)' : 'var(--color-bg-surface)',
                      cursor: done ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                      opacity: done ? 0.6 : 1,
                    }}
                    whileHover={!done ? { scale: 1.01, background: 'var(--color-bg-sunken)' } : {}}
                    whileTap={!done ? { scale: 0.98 } : {}}
                  >
                    {/* Step icon or check */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: done ? 'var(--color-success-bg)' : `${step.color}14`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done
                        ? <Check size={16} color="#16a34a" strokeWidth={3} />
                        : <step.icon size={16} color={step.color} />
                      }
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 700, margin: 0,
                        color: done ? 'var(--color-text-subtle)' : 'var(--color-text-strong)',
                        textDecoration: done ? 'line-through' : 'none',
                      }}>
                        {step.title}
                      </p>
                      {!done && (
                        <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '2px 0 0', lineHeight: 1.4 }}>
                          {step.desc}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    {!done && (
                      <ArrowRight size={14} color="var(--color-text-subtle)" style={{ flexShrink: 0 }} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Dismiss */}
            <div style={{ padding: '0 16px 14px', textAlign: 'center' }}>
              <button
                onClick={handleDismiss}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--color-text-subtle)', fontWeight: 600,
                }}
              >
                Não mostrar mais
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ArrowRight, Sparkles, ReceiptText, Target, CreditCard, Landmark, Settings } from 'lucide-react';
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
  { key: 'transaction', icon: ReceiptText, title: 'Adicione seu primeiro lançamento', desc: 'Registre uma receita ou despesa.', route: '/app/transactions', color: '#16a34a' },
  { key: 'goal', icon: Target, title: 'Crie uma meta financeira', desc: 'Defina quanto quer economizar.', route: '/app/goals', color: '#7c3aed' },
  { key: 'card', icon: CreditCard, title: 'Cadastre um cartão de crédito', desc: 'Controle limites e faturas.', route: '/app/cards', color: '#0891b2' },
  { key: 'budget', icon: Landmark, title: 'Defina um orçamento mensal', desc: 'Limite gastos por categoria.', route: '/app/budget', color: '#ea580c' },
  { key: 'settings', icon: Settings, title: 'Personalize seu perfil', desc: 'Foto, moeda e preferências.', route: '/app/settings', color: '#6366f1' },
];

export default function WelcomeChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

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
  const remaining = STEPS.length - completedCount;

  // Auto-collapse after 2+ items done
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!loading) setExpanded(completedCount < 2);
  }, [loading, completedCount]);

  const handleDismiss = () => {
    if (user) localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
    setDismissed(true);
  };

  if (loading || dismissed || allDone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-weak)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible, compact */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Progress circle */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border-base)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#16a34a" strokeWidth="3"
              strokeDasharray={`${progress * 0.94} 94`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#16a34a',
          }}>
            {completedCount}/{STEPS.length}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>
            Primeiros passos
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
            {remaining} passo{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} color="var(--color-text-muted)" />
        </motion.div>
      </div>

      {/* Expandable steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid var(--color-border-weak)',
              padding: '8px 16px 12px',
            }}>
              {STEPS.map((step, i) => {
                const done = completed[step.key];
                return (
                  <div
                    key={step.key}
                    onClick={() => !done && navigate(step.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: i < STEPS.length - 1 ? '1px solid var(--color-border-weak)' : 'none',
                      opacity: done ? 0.5 : 1,
                      cursor: done ? 'default' : 'pointer',
                    }}
                  >
                    {/* Check circle */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: done ? '#16a34a' : 'transparent',
                      border: done ? 'none' : '2px solid var(--color-border-base)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <Check size={13} color="white" strokeWidth={3} />}
                    </div>

                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: done ? 'var(--color-bg-sunken)' : `${step.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <step.icon size={16} color={done ? 'var(--color-text-subtle)' : step.color} />
                    </div>

                    {/* Text — NO strikethrough */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: done ? 'var(--color-text-subtle)' : 'var(--color-text-base)',
                      }}>
                        {step.title}
                      </div>
                      {!done && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 1 }}>
                          {step.desc}
                        </div>
                      )}
                    </div>

                    {!done && <ArrowRight size={14} color="var(--color-text-subtle)" />}
                  </div>
                );
              })}

              <button
                onClick={handleDismiss}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  fontSize: 12, color: 'var(--color-text-subtle)',
                  padding: '8px 0 0', cursor: 'pointer',
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

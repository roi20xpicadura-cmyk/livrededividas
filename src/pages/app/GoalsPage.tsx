import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { PLAN_LIMITS, PlanType } from '@/lib/plans';
import { OBJECTIVES } from '@/lib/objectives';
import {
  Plus, ChevronDown, Pencil, Check, Trophy,
  PiggyBank, Archive
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import BottomSheet from '@/components/app/BottomSheet';
import type { Database } from '@/integrations/supabase/types';
import {
  readGoalsCache,
  writeGoalsCache,
  applyDepositToCache,
} from '@/lib/goalsCache';

type GoalRow = Database['public']['Tables']['goals']['Row'];

interface GoalFormState {
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string;
  objective_type: string;
}

type EditGoalState = (GoalRow & { _prefill?: boolean }) | { _prefill: true; name?: string } | null;

/* ─── Helpers ─── */
function formatMoney(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getGoalEmoji(name: string): string {
  if (!name) return '🎯';
  const n = name.toLowerCase();
  if (/viagem|férias|ferias|trip|europa|eua|disney/.test(n)) return '✈️';
  if (/casa|apartamento|imóvel|imovel|moradia/.test(n)) return '🏠';
  if (/carro|veículo|veiculo|moto/.test(n)) return '🚗';
  if (/casamento|wedding|noivado/.test(n)) return '💍';
  if (/faculdade|universidade|estudo|curso|mba/.test(n)) return '🎓';
  if (/emergência|emergencia|reserva/.test(n)) return '🛡️';
  if (/dívida|divida|cartão|cartao/.test(n)) return '💳';
  if (/negócio|negocio|empresa|empreend/.test(n)) return '💼';
  if (/aposentadoria|pensão|pensao/.test(n)) return '🏖️';
  if (/computador|notebook|celular|iphone|tech/.test(n)) return '💻';
  if (/filho|filha|criança|bebe|bebê/.test(n)) return '👶';
  if (/saúde|saude|cirurgia|plano/.test(n)) return '❤️';
  if (/reforma|renovar|obra/.test(n)) return '🔨';
  if (/investimento|bolsa|ações|acoes/.test(n)) return '📈';
  return '🎯';
}

/* ─── Main Page ─── */
export default function GoalsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const limits = PLAN_LIMITS[plan];

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<EditGoalState>(null);

  // Hydrate instantly from localStorage cache on mount so the UI never flashes
  // empty values while Supabase loads — and survives offline reloads.
  useEffect(() => {
    if (!user) return;
    const cached = readGoalsCache(user.id);
    if (cached && cached.length > 0) {
      setGoals(cached);
      setLoading(false);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error || !data) {
      // Supabase unreachable — fall back to cache so values + progress survive.
      const cached = readGoalsCache(user.id);
      if (cached) {
        setGoals(cached);
        setUsingCache(true);
      }
      setLoading(false);
      return;
    }

    setGoals(data);
    setUsingCache(false);
    writeGoalsCache(user.id, data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // When the network comes back online, refresh from Supabase.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => { void fetchGoals(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [fetchGoals]);

  const activeGoals = useMemo(() =>
    goals.filter(g => Number(g.current_amount) < Number(g.target_amount)),
    [goals]
  );
  const completedGoals = useMemo(() =>
    goals.filter(g => Number(g.current_amount) >= Number(g.target_amount)),
    [goals]
  );

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#7C3AED', '#22c55e', '#d97706', '#f59e0b', '#ffffff'] });
  };

  const handleDeposit = async (goalId: string, amount: number) => {
    if (!user || amount <= 0) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newVal = Number(goal.current_amount) + amount;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Optimistic UI + cache write so a reload right after still shows the
    // updated "Valor Guardado" and progress, even if the network drops.
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, current_amount: newVal } : g,
      ),
    );
    applyDepositToCache(user.id, goalId, amount);

    await Promise.all([
      supabase.from('goals').update({ current_amount: newVal }).eq('id', goalId),
      supabase.from('goal_deposits').insert({ user_id: user.id, goal_id: goalId, amount, deposit_date: today }),
      supabase.from('goal_checkins').insert({ user_id: user.id, goal_id: goalId, date: today, amount }),
    ]);

    if (newVal >= Number(goal.target_amount) && Number(goal.current_amount) < Number(goal.target_amount)) {
      triggerConfetti();
      toast('🏆 Parabéns! Meta concluída!', { description: goal.name, duration: 4000 });
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    } else {
      toast.success(`+R$ ${formatMoney(amount)} guardado para "${goal.name}" 🎯`);
    }
    fetchGoals();
  };

  const handleSaveGoal = async (form: GoalFormState) => {
    if (!user) return;
    const target = parseFloat(form.target_amount);
    if (!form.name?.trim() || isNaN(target) || target <= 0) {
      toast.error('Preencha nome e valor da meta');
      return;
    }

    if (editGoal && 'id' in editGoal && editGoal.id) {
      await supabase.from('goals').update({
        name: form.name.trim(),
        target_amount: target,
        current_amount: parseFloat(form.current_amount) || 0,
        deadline: form.deadline || null,
        objective_type: form.objective_type || 'custom',
      }).eq('id', editGoal.id);
      toast.success('Meta atualizada!');
    } else {
      if (limits.goals !== Infinity && goals.length >= limits.goals) {
        toast.error('Limite de metas atingido. Faça upgrade!');
        return;
      }
      await supabase.from('goals').insert({
        user_id: user.id,
        name: form.name.trim(),
        target_amount: target,
        current_amount: parseFloat(form.current_amount) || 0,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        deadline: form.deadline || null,
        objective_type: form.objective_type || 'custom',
      });
      toast.success('Meta criada com sucesso! 🎯');
    }
    setSheetOpen(false);
    setEditGoal(null);
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('goals').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    toast.success('Meta removida');
    fetchGoals();
  };

  const handleComplete = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    await supabase.from('goals').update({ current_amount: Number(goal.target_amount) }).eq('id', id);
    triggerConfetti();
    toast('🏆 Parabéns! Meta concluída!', { description: goal.name, duration: 3000 });
    fetchGoals();
  };

  const openEdit = (goal: GoalRow) => {
    setEditGoal(goal);
    setSheetOpen(true);
  };

  const openAddGoal = (prefill?: { name?: string }) => {
    setEditGoal(prefill ? { _prefill: true, name: prefill.name } : null);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-bg-base)',
      paddingBottom: 24,
    }}>
      {usingCache && (
        <div
          role="status"
          style={{
            margin: '8px 16px 0',
            padding: '8px 12px',
            borderRadius: 10,
            background: 'var(--color-warning-soft, #FEF3C7)',
            border: '1px solid var(--color-warning, #F59E0B)',
            color: 'var(--color-warning-strong, #92400E)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          📡 Sem conexão — exibindo valores salvos no dispositivo. Vão sincronizar ao voltar online.
        </div>
      )}
      {/* Header — Premium */}
      {goals.length > 0 && (
        <div style={{
          padding: '8px 20px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px',
              borderRadius: 99,
              background: 'hsl(var(--primary) / 0.10)',
              border: '0.5px solid hsl(var(--primary) / 0.18)',
              fontSize: 11.5, fontWeight: 800,
              color: 'hsl(var(--primary))',
              letterSpacing: '-0.01em',
              fontFeatureSettings: '"tnum"',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'hsl(var(--primary))',
                boxShadow: '0 0 0 3px hsl(var(--primary) / 0.18)',
              }} />
              {activeGoals.length} ativa{activeGoals.length !== 1 ? 's' : ''}
            </div>
            {completedGoals.length > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11.5, fontWeight: 700,
                color: 'var(--color-text-subtle)',
              }}>
                <Trophy size={11} color="#d97706" />
                {completedGoals.length} concluída{completedGoals.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => openAddGoal()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px',
              background: 'hsl(var(--primary))',
              border: 'none', borderRadius: 11,
              color: 'white', fontSize: 13, fontWeight: 800,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              boxShadow: '0 6px 18px hsl(var(--primary) / 0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
              flexShrink: 0,
            }}
          >
            <Plus size={14} strokeWidth={2.75} />
            Nova meta
          </motion.button>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <EmptyState onAdd={openAddGoal} />
      )}

      {/* Summary bar */}
      {activeGoals.length >= 2 && (
        <SummaryBar goals={activeGoals} />
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
          {activeGoals.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              index={i}
              onDeposit={handleDeposit}
              onEdit={openEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <CompletedSection goals={completedGoals} />
      )}

      {/* Add/Edit sheet */}
      <GoalSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditGoal(null); }}
        editGoal={editGoal}
        onSave={handleSaveGoal}
      />
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onAdd }: { onAdd: (prefill?: { name?: string }) => void }) {
  const inspirations = [
    { emoji: '✈️', label: 'Viagem dos sonhos' },
    { emoji: '🏠', label: 'Casa própria' },
    { emoji: '🚗', label: 'Carro novo' },
    { emoji: '🎓', label: 'Curso ou faculdade' },
    { emoji: '🛡️', label: 'Reserva de emergência' },
    { emoji: '💍', label: 'Casamento' },
  ];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '32px 24px 40px', textAlign: 'center',
    }}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        style={{ fontSize: 56, marginBottom: 20, lineHeight: 1 }}
      >
        🎯
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          fontSize: 20, fontWeight: 900,
          color: 'var(--color-text-strong)',
          letterSpacing: '-0.02em', marginBottom: 8,
        }}
      >
        Quais são seus sonhos?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          fontSize: 14, color: 'var(--color-text-subtle)',
          lineHeight: 1.6, maxWidth: 260, marginBottom: 28,
        }}
      >
        Defina metas e a KoraFinance IA cria um plano para você chegar lá.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'center', marginBottom: 28, maxWidth: 300,
        }}
      >
        {inspirations.map((g, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAdd({ name: g.label })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 99, fontSize: 13, fontWeight: 500,
              color: 'var(--color-text-base)', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 15 }}>{g.emoji}</span>
            {g.label}
          </motion.button>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onAdd()}
        style={{
          height: 50, padding: '0 32px',
          background: 'hsl(var(--primary))',
          border: 'none', borderRadius: 14,
          color: 'white', fontSize: 15, fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(124, 58, 237,0.35)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <Plus size={18} />
        Criar minha primeira meta
      </motion.button>
    </div>
  );
}

/* ─── Summary Bar ─── */
function SummaryBar({ goals }: { goals: GoalRow[] }) {
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const remaining = Math.max(0, totalTarget - totalSaved);

  // Deadline-aware status: compute expected progress based on time elapsed
  // vs actual progress. If we're materially behind schedule → "alerta",
  // otherwise → "no ritmo". No aggressive red — uses brand + amber only.
  const { status, expectedPct } = useMemo(() => {
    const withDeadline = goals.filter(g => g.deadline && g.start_date);
    if (withDeadline.length === 0) {
      return { status: 'on-track' as const, expectedPct: overallPct };
    }
    const now = Date.now();
    let weightedExpected = 0;
    let weightTotal = 0;
    withDeadline.forEach(g => {
      const start = new Date(g.start_date!).getTime();
      const end = new Date(g.deadline!).getTime();
      const weight = Number(g.target_amount) || 0;
      if (end <= start || weight <= 0) return;
      const elapsed = Math.max(0, Math.min(1, (now - start) / (end - start)));
      weightedExpected += elapsed * 100 * weight;
      weightTotal += weight;
    });
    const expected = weightTotal > 0 ? weightedExpected / weightTotal : overallPct;
    const gap = expected - overallPct;
    const st = overallPct >= 100
      ? 'done'
      : gap >= 15
        ? 'alert'
        : gap >= 5
          ? 'warning'
          : 'on-track';
    return { status: st as 'done' | 'alert' | 'warning' | 'on-track', expectedPct: expected };
  }, [goals, overallPct]);

  const statusConfig = {
    'done': {
      label: 'Concluído',
      dot: '#22c55e',
      chipBg: 'rgba(34,197,94,0.12)',
      chipText: '#16a34a',
      barColor: 'linear-gradient(90deg, hsl(var(--primary)), #22c55e)',
      hint: 'Todas as metas alcançadas! 🎉',
    },
    'on-track': {
      label: 'No ritmo',
      dot: 'hsl(var(--primary))',
      chipBg: 'hsl(var(--primary) / 0.10)',
      chipText: 'hsl(var(--primary))',
      barColor: 'hsl(var(--primary))',
      hint: null,
    },
    'warning': {
      label: 'Acelerar',
      dot: '#d97706',
      chipBg: 'rgba(217,119,6,0.10)',
      chipText: '#b45309',
      barColor: 'linear-gradient(90deg, hsl(var(--primary)), #f59e0b)',
      hint: 'Um pequeno empurrão e você volta ao ritmo.',
    },
    'alert': {
      label: 'Atenção',
      dot: '#d97706',
      chipBg: 'rgba(217,119,6,0.14)',
      chipText: '#b45309',
      barColor: 'linear-gradient(90deg, hsl(var(--primary)), #f59e0b)',
      hint: 'Você está atrás do planejado. Que tal um depósito hoje?',
    },
  }[status];

  return (
    <div style={{
      margin: '14px 16px 0',
      background: 'var(--color-bg-surface)',
      borderRadius: 18,
      padding: '16px 18px 18px',
      boxShadow: 'var(--shadow-sm)',
      border: '0.5px solid var(--color-border-weak)',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Progresso geral
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          gap: 6, padding: '3px 10px',
          background: statusConfig.chipBg,
          borderRadius: 99,
          fontSize: 11, fontWeight: 800,
          color: statusConfig.chipText,
          letterSpacing: '-0.01em',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: statusConfig.dot,
            boxShadow: `0 0 0 3px ${statusConfig.dot}22`,
          }} />
          {statusConfig.label}
        </div>
      </div>

      {/* Amount */}
      <div style={{
        display: 'flex', alignItems: 'baseline',
        gap: 6, marginBottom: 10, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 24, fontWeight: 900,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.03em',
          color: 'var(--color-text-strong)',
          lineHeight: 1,
        }}>
          R$ {formatMoney(totalSaved)}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--color-text-subtle)',
          fontWeight: 500,
        }}>
          de R$ {formatMoney(totalTarget)}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12, fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-strong)',
          letterSpacing: '-0.02em',
        }}>
          {overallPct.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar — status aware, with expected marker */}
      <div style={{
        position: 'relative',
        height: 8, background: 'var(--color-bg-sunken)',
        borderRadius: 99, overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 99, overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 99,
              background: statusConfig.barColor,
            }}
          />
        </div>
        {/* Expected-progress marker (only if deadline data exists and makes sense) */}
        {expectedPct > 1 && expectedPct < 100 && Math.abs(expectedPct - overallPct) > 1 && (
          <div
            title={`Esperado: ${expectedPct.toFixed(0)}%`}
            style={{
              position: 'absolute',
              left: `${Math.min(99, expectedPct)}%`,
              top: -2, bottom: -2,
              width: 2,
              background: 'var(--color-text-subtle)',
              opacity: 0.45,
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Footer: status-aware hint or remaining amount */}
      <div style={{
        marginTop: 10,
        fontSize: 11.5,
        color: 'var(--color-text-subtle)',
        fontWeight: 500,
        lineHeight: 1.4,
      }}>
        {statusConfig.hint ? (
          <span style={{ color: statusConfig.chipText, fontWeight: 600 }}>
            {statusConfig.hint}
          </span>
        ) : remaining > 0 ? (
          <>
            Falta{' '}
            <span style={{
              color: 'var(--color-text-base)', fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}>
              R$ {formatMoney(remaining)}
            </span>
            {' '}para alcançar todas as metas
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Goal Card ─── */
function GoalCard({ goal, index, onDeposit, onEdit, onDelete, onComplete }: {
  goal: GoalRow; index: number;
  onDeposit: (id: string, amount: number) => void;
  onEdit: (g: GoalRow) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  const remaining = Math.max(0, target - current);
  const isCompleted = pct >= 100;

  const emoji = getGoalEmoji(goal.name);
  const obj = OBJECTIVES.find(o => o.key === goal.objective_type);

  const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null;
  const isLate = daysLeft !== null && daysLeft < 0 && !isCompleted;

  const barColor = isCompleted ? '#7C3AED'
    : isLate ? '#ef4444'
    : pct >= 60 ? '#7C3AED'
    : pct >= 30 ? '#f59e0b'
    : '#ef4444';

  const handleDepositSubmit = () => {
    const val = parseFloat(depositAmount);
    if (val > 0) {
      onDeposit(goal.id, val);
      setDepositAmount('');
    }
  };

  const presets = target <= 1000 ? [50, 100, 200] : target <= 10000 ? [100, 500, 1000] : [500, 1000, 5000];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      style={{
        margin: '0 16px',
        background: 'var(--color-bg-surface)',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        border: isCompleted
          ? '1.5px solid hsl(var(--primary))'
          : '0.5px solid var(--color-border-weak)',
      }}
    >
      {/* Completed banner */}
      {isCompleted && (
        <div style={{
          background: 'hsl(var(--primary))', padding: '5px 16px',
          fontSize: 10, fontWeight: 800, color: 'white',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          🏆 Meta concluída! Parabéns!
        </div>
      )}

      {/* Late warning */}
      {isLate && (
        <div style={{
          background: 'var(--color-danger-bg)', padding: '5px 16px',
          fontSize: 10, fontWeight: 700, color: 'var(--color-danger-text)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          ⚠️ Prazo vencido — ajuste seu plano
        </div>
      )}

      {/* Main content */}
      <div style={{ padding: '18px 18px 0' }}>
        {/* Top row */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          gap: 12, marginBottom: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: isCompleted ? 'var(--color-success-bg)' : 'var(--color-bg-sunken)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            {obj?.emoji || emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 800,
              color: 'var(--color-text-strong)',
              letterSpacing: '-0.01em', marginBottom: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {goal.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
              {goal.deadline
                ? `Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
                : 'Sem prazo definido'}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setExpanded(!expanded)}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--color-bg-sunken)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronDown
              size={15}
              color="var(--color-text-subtle)"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms',
              }}
            />
          </motion.button>
        </div>

        {/* Amount row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 10,
        }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-text-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 3,
            }}>
              Guardado
            </div>
            <div style={{
              fontSize: 22, fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.03em',
              color: isCompleted ? 'hsl(var(--primary))' : 'var(--color-text-strong)',
              lineHeight: 1,
            }}>
              R$ {formatMoney(current)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-text-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 3,
            }}>
              Meta
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-muted)',
            }}>
              R$ {formatMoney(target)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{
            height: 10, background: 'var(--color-bg-sunken)',
            borderRadius: 99, overflow: 'hidden', position: 'relative',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.1 }}
              style={{
                height: '100%', borderRadius: 99,
                background: barColor, position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 1, left: 4, right: 4,
                height: 3, background: 'rgba(255,255,255,0.3)',
                borderRadius: 99,
              }} />
            </motion.div>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 5,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 800,
              color: barColor, fontFamily: 'var(--font-mono)',
            }}>
              {pct.toFixed(0)}% completo
            </div>
            {!isCompleted && (
              <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                Falta R$ {formatMoney(remaining)}
              </div>
            )}
          </div>
        </div>

        {/* Quick CTA when collapsed */}
        {!isCompleted && !expanded && (
          <div style={{ paddingBottom: 16 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setExpanded(true)}
              style={{
                width: '100%', height: 40,
                background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border-base)',
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                color: 'var(--color-text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
              }}
            >
              <PiggyBank size={14} />
              Guardar dinheiro
            </motion.button>
          </div>
        )}

        {isCompleted && !expanded && <div style={{ height: 16 }} />}
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '14px 18px 18px',
              borderTop: '0.5px solid var(--color-border-ghost)',
            }}>
              {/* Deposit input */}
              {!isCompleted && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--color-text-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: 8,
                  }}>
                    Guardar agora
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center',
                      background: 'var(--color-bg-sunken)',
                      border: '1.5px solid var(--color-border-base)',
                      borderRadius: 12, padding: '0 14px', height: 46,
                    }}>
                      <span style={{
                        fontSize: 14, color: 'var(--color-text-subtle)',
                        marginRight: 6, fontWeight: 600,
                      }}>
                        R$
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="0,00"
                        onKeyDown={e => { if (e.key === 'Enter') handleDepositSubmit(); }}
                        style={{
                          flex: 1, background: 'none', border: 'none',
                          outline: 'none', fontSize: 16, fontWeight: 700,
                          color: 'var(--color-text-strong)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDepositSubmit}
                      disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                      style={{
                        width: 46, height: 46, borderRadius: 12,
                        background: depositAmount && parseFloat(depositAmount) > 0
                          ? 'hsl(var(--primary))' : 'var(--color-bg-sunken)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: depositAmount && parseFloat(depositAmount) > 0
                          ? '0 2px 8px rgba(124, 58, 237,0.3)' : 'none',
                      }}
                    >
                      <Check
                        size={18}
                        color={depositAmount && parseFloat(depositAmount) > 0
                          ? 'white' : 'var(--color-text-disabled)'}
                      />
                    </motion.button>
                  </div>

                  {/* Quick pills */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {presets.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setDepositAmount(String(amt))}
                        style={{
                          padding: '4px 10px',
                          background: String(depositAmount) === String(amt)
                            ? 'var(--color-success-bg)' : 'var(--color-bg-sunken)',
                          border: `1px solid ${String(depositAmount) === String(amt)
                            ? 'var(--color-success-border)' : 'var(--color-border-base)'}`,
                          borderRadius: 99, fontSize: 12, fontWeight: 600,
                          color: String(depositAmount) === String(amt)
                            ? 'var(--color-success-text)' : 'var(--color-text-subtle)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        R$ {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onEdit(goal)}
                  style={{
                    flex: 1, height: 38,
                    background: 'var(--color-bg-sunken)',
                    border: '1px solid var(--color-border-base)',
                    borderRadius: 10, fontSize: 12, fontWeight: 700,
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 5,
                  }}
                >
                  <Pencil size={12} />
                  Editar
                </motion.button>
                {!isCompleted && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onComplete(goal.id)}
                    style={{
                      flex: 1, height: 38,
                      background: 'var(--color-bg-sunken)',
                      border: '1px solid var(--color-border-base)',
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      color: 'var(--color-text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Trophy size={12} />
                    Concluir
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (confirm('Excluir esta meta?')) onDelete(goal.id);
                  }}
                  style={{
                    width: 38, height: 38,
                    background: 'var(--color-bg-sunken)',
                    border: '1px solid var(--color-border-base)',
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Archive size={13} color="var(--color-text-muted)" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Completed Section ─── */
function CompletedSection({ goals }: { goals: GoalRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: '0 16px', marginTop: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 10, cursor: 'pointer',
          background: 'none', border: 'none', padding: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: '#d97706' }}>
          🏆 Concluídas ({goals.length})
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} color="#d97706" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goals.map((g, i) => {
                const obj = OBJECTIVES.find(o => o.key === g.objective_type);
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      background: 'var(--color-bg-surface)',
                      borderRadius: 14, padding: '14px 16px',
                      border: '1px solid var(--color-border-weak)',
                      display: 'flex', alignItems: 'center', gap: 12,
                      opacity: 0.8,
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'var(--color-warning-bg)',
                      border: '1px solid var(--color-warning-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {obj?.emoji || getGoalEmoji(g.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: 'var(--color-text-strong)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                        R$ {formatMoney(Number(g.target_amount))}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 99,
                      background: 'var(--color-warning-bg)',
                      border: '1px solid var(--color-warning-border)',
                      color: 'var(--color-warning-text)',
                    }}>
                      🏆 100%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Goal Sheet (Add/Edit) ─── */
function GoalSheet({ open, onClose, editGoal, onSave }: {
  open: boolean;
  onClose: () => void;
  editGoal: EditGoalState;
  onSave: (form: GoalFormState) => void;
}) {
  const isEdit = Boolean(editGoal && 'id' in editGoal && !editGoal._prefill);
  const [form, setForm] = useState<GoalFormState>({
    name: '',
    target_amount: '',
    current_amount: '0',
    deadline: '',
    objective_type: 'custom',
  });

  useEffect(() => {
    if (open) {
      if (isEdit && editGoal && 'id' in editGoal) {
        setForm({
          name: editGoal.name || '',
          target_amount: String(editGoal.target_amount || ''),
          current_amount: String(editGoal.current_amount || '0'),
          deadline: editGoal.deadline ? editGoal.deadline.slice(0, 7) : '',
          objective_type: editGoal.objective_type || 'custom',
        });
      } else {
        setForm({
          name: editGoal?.name || '',
          target_amount: '',
          current_amount: '0',
          deadline: '',
          objective_type: 'custom',
        });
      }
    }
  }, [open, editGoal, isEdit]);

  const suggestedEmoji = getGoalEmoji(form.name);

  const canSave = form.name.trim() && form.target_amount && parseFloat(form.target_amount) > 0;

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Editar meta' : 'Nova meta'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Name with emoji */}
        <div>
          <label style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'block', marginBottom: 6,
          }}>
            Nome da meta *
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'var(--color-bg-sunken)',
              border: '1.5px solid var(--color-border-base)',
              fontSize: 24, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {suggestedEmoji}
            </div>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Viagem para Europa"
              style={{
                flex: 1, height: 52, padding: '0 14px',
                background: 'var(--color-bg-sunken)',
                border: '1.5px solid var(--color-border-base)',
                borderRadius: 12, fontSize: 16,
                color: 'var(--color-text-strong)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Target */}
        <div>
          <label style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-subtle)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'block', marginBottom: 6,
          }}>
            Valor total da meta *
          </label>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--color-bg-sunken)',
            border: '1.5px solid var(--color-border-base)',
            borderRadius: 12, padding: '0 14px', height: 52,
          }}>
            <span style={{
              fontSize: 14, color: 'var(--color-text-subtle)',
              marginRight: 6, fontWeight: 600,
            }}>R$</span>
            <input
              type="number"
              inputMode="decimal"
              value={form.target_amount}
              onChange={e => setForm({ ...form, target_amount: e.target.value })}
              placeholder="0,00"
              style={{
                flex: 1, background: 'none', border: 'none',
                outline: 'none', fontSize: 16, fontWeight: 700,
                color: 'var(--color-text-strong)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </div>

        {/* Current amount (only for edit) */}
        {isEdit && (
          <div>
            <label style={{
              fontSize: 11, fontWeight: 700,
              color: 'var(--color-text-subtle)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'block', marginBottom: 6,
            }}>
              Valor atual guardado
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--color-bg-sunken)',
              border: '1.5px solid var(--color-border-base)',
              borderRadius: 12, padding: '0 14px', height: 52,
            }}>
              <span style={{
                fontSize: 14, color: 'var(--color-text-subtle)',
                marginRight: 6, fontWeight: 600,
              }}>R$</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.current_amount}
                onChange={e => setForm({ ...form, current_amount: e.target.value })}
                placeholder="0,00"
                style={{
                  flex: 1, background: 'none', border: 'none',
                  outline: 'none', fontSize: 16, fontWeight: 700,
                  color: 'var(--color-text-strong)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          </div>
        )}

        {/* Deadline */}
        <div>
          <label style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-subtle)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'block', marginBottom: 6,
          }}>
            Prazo <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </label>
          <input
            type="month"
            value={form.deadline}
            onChange={e => setForm({ ...form, deadline: e.target.value })}
            style={{
              width: '100%', height: 52, padding: '0 14px',
              background: 'var(--color-bg-sunken)',
              border: '1.5px solid var(--color-border-base)',
              borderRadius: 12, fontSize: 16,
              color: 'var(--color-text-strong)', outline: 'none',
            }}
          />
        </div>

        {/* Save button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSave(form)}
          disabled={!canSave}
          style={{
            width: '100%', height: 52,
            background: canSave ? 'hsl(var(--primary))' : 'var(--color-bg-sunken)',
            border: 'none', borderRadius: 14,
            color: canSave ? 'white' : 'var(--color-text-disabled)',
            fontSize: 15, fontWeight: 800, cursor: 'pointer',
            boxShadow: canSave ? '0 4px 14px rgba(124, 58, 237,0.35)' : 'none',
            transition: 'all 200ms',
            marginTop: 4,
          }}
        >
          {isEdit ? 'Salvar alterações' : 'Criar meta 🎯'}
        </motion.button>
      </div>
    </BottomSheet>
  );
}

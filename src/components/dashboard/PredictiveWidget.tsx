import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/plans';
import { buildPrediction, DayPrediction } from '@/lib/predictionEngine';
import { AlertTriangle, AlertCircle, Sparkles, ChevronRight, Calendar, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const LazyMiniChart = lazy(() => import('recharts').then(m => ({
  default: ({ predictions, status }: { predictions: DayPrediction[]; status: string }) => {
    const hasNegative = predictions.some(p => p.projectedBalance < 0);
    return (
      <m.ResponsiveContainer width="100%" height={70}>
        <m.AreaChart data={predictions.slice(0, 30)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="widgetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={status === 'danger' ? '#ef4444' : '#22c55e'} stopOpacity={0.2} />
              <stop offset="95%" stopColor={status === 'danger' ? '#ef4444' : '#22c55e'} stopOpacity={0} />
            </linearGradient>
          </defs>
          {hasNegative && <m.ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />}
          <m.Area type="monotone" dataKey="projectedBalance" stroke={status === 'danger' ? '#ef4444' : '#22c55e'} strokeWidth={2} fill="url(#widgetGrad)" dot={false} />
        </m.AreaChart>
      </m.ResponsiveContainer>
    );
  }
})));

export default function PredictiveWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<DayPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const start3m = format(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd');

    Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start3m).is('deleted_at', null),
      supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('scheduled_bills').select('*').eq('user_id', user.id).eq('status', 'pending'),
    ]).then(([txRes, recRes, billRes]) => {
      const txs = txRes.data || [];
      const incomes = txs.filter(t => t.type === 'income');
      const expenses = txs.filter(t => t.type === 'expense');
      const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0) / 3;
      const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0) / 3;

      const preds = buildPrediction(totalIncome - totalExpense, txs, recRes.data || [], billRes.data || [], 90);
      setPredictions(preds);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <div className="skeleton-shimmer" style={{ height: 140, borderRadius: 16 }} />;
  }

  const firstNeg = predictions.find(p => p.isNegative);
  const lowestBal = predictions.length > 0 ? Math.min(...predictions.map(p => p.projectedBalance)) : 0;
  const status = firstNeg ? 'danger' : lowestBal < 500 ? 'warning' : 'good';

  const nextCriticalEvent = predictions.flatMap(p => p.events.filter(e => e.amount < 0 && e.probability > 0.8).map(e => ({ ...e, date: p.date })))[0];
  const daysUntil = (date: string) => Math.max(1, differenceInDays(new Date(date), new Date()));

  const colors = {
    danger: { bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)', text: 'var(--color-danger-text)', badge: 'var(--color-danger-solid)' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', badge: '#d97706' },
    good: { bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', text: 'var(--color-success-text)', badge: '#7C3AED' },
  }[status];

  return (
    <div style={{
      background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 16, padding: '16px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {status === 'danger' && (
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', transform: 'translate(20px,-20px)' }} />
      )}

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {status === 'danger' ? <AlertTriangle size={16} style={{ color: colors.text }} />
            : status === 'warning' ? <AlertCircle size={16} style={{ color: colors.text }} />
            : <Sparkles size={16} style={{ color: colors.text }} />}
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>IA Preditiva</span>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: colors.badge, color: 'white' }}>
            {status === 'danger' ? '⚠️ ALERTA' : '✓ OK'}
          </span>
        </div>
        <button onClick={() => navigate('/app/predictions')} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          Detalhes <ChevronRight size={13} />
        </button>
      </div>

      <div style={{ marginBottom: predictions.length > 0 ? 8 : 0 }}>
        {status === 'danger' && firstNeg ? (
          <>
            <p style={{ fontSize: 15, fontWeight: 900, color: colors.text, letterSpacing: '-0.3px', marginBottom: 3 }}>
              Saldo negativo previsto em {daysUntil(firstNeg.date)} dias
            </p>
            <p style={{ fontSize: 12, color: colors.text, opacity: 0.8 }}>
              Saldo pode chegar a <strong>{formatCurrency(firstNeg.projectedBalance, 'R$')}</strong> no dia {format(new Date(firstNeg.date), 'dd/MM')}
            </p>
          </>
        ) : status === 'warning' ? (
          <>
            <p style={{ fontSize: 15, fontWeight: 900, color: colors.text, letterSpacing: '-0.3px', marginBottom: 3 }}>
              Saldo baixo previsto: {formatCurrency(lowestBal, 'R$')}
            </p>
            <p style={{ fontSize: 12, color: colors.text, opacity: 0.8 }}>Fique atento nos próximos 30 dias.</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, fontWeight: 900, color: colors.text, letterSpacing: '-0.3px', marginBottom: 3 }}>
              Finanças saudáveis nos próximos 90 dias ✓
            </p>
            <p style={{ fontSize: 12, color: colors.text, opacity: 0.8 }}>Nenhum risco detectado. Continue assim!</p>
          </>
        )}
      </div>

      {/* Only render chart when there's meaningful data */}
      {predictions.length > 0 && (
        <Suspense fallback={<div className="skeleton-shimmer" style={{ height: 70, borderRadius: 8 }} />}>
          <LazyMiniChart predictions={predictions} status={status} />
        </Suspense>
      )}

      {nextCriticalEvent && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={13} style={{ color: 'var(--color-text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Próximo: <strong style={{ color: 'var(--color-text-base)' }}>{nextCriticalEvent.description}</strong>
            {' '}— {formatCurrency(Math.abs(nextCriticalEvent.amount), 'R$')} em {daysUntil(nextCriticalEvent.date)} dias
          </span>
        </div>
      )}

      {status === 'danger' && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/app/predictions')}
          style={{
            marginTop: 10, width: '100%', height: 36, borderRadius: 10, background: 'var(--color-danger-solid)',
            border: 'none', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <Zap size={13} /> Ver plano de ação →
        </motion.button>
      )}
    </div>
  );
}

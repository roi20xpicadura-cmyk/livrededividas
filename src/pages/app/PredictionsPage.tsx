import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/plans';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildPrediction, generateAlerts, DayPrediction, PredictionAlert } from '@/lib/predictionEngine';
import {
  AlertCircle, Activity, Zap, Sparkles, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const LazyPredChart = lazy(() => import('recharts').then(m => ({
  default: ({ predictions, status }: { predictions: DayPrediction[]; status: string }) => {
    const data = predictions.map(p => ({
      date: format(new Date(p.date), 'dd/MM'),
      saldo: Math.round(p.projectedBalance),
      upper: Math.round(p.projectedBalance * (1 + (1 - p.confidence) * 0.5)),
      lower: Math.round(p.projectedBalance * (1 - (1 - p.confidence) * 0.5)),
    }));
    const strokeColor = status === 'danger' ? '#ef4444' : '#22c55e';
    return (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.08} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <m.XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} interval={6} />
          <m.YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
          <m.ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
          <m.Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 10, fontSize: 12 }} />
          <m.Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" name="Limite superior" />
          <m.Area type="monotone" dataKey="lower" stroke="none" fill="url(#confGrad)" name="Limite inferior" />
          <m.Area type="monotone" dataKey="saldo" stroke={strokeColor} strokeWidth={2.5} fill="url(#predGrad)" name="Saldo projetado" />
        </m.ComposedChart>
      </m.ResponsiveContainer>
    );
  }
})));

export default function PredictionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [predictions, setPredictions] = useState<DayPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 60 | 90>(30);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'estimated' | 'income' | 'expense'>('all');
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  useEffect(() => {
    if (!user) return;
    const start3m = format(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd');

    Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start3m).is('deleted_at', null),
      supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('scheduled_bills').select('*').eq('user_id', user.id).eq('status', 'pending'),
    ]).then(([txRes, recRes, billRes]) => {
      const txs = txRes.data || [];
      const expenses = txs.filter(t => t.type === 'expense');
      const incomes = txs.filter(t => t.type === 'income');
      const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0) / 3;
      const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0) / 3;
      const currentBalance = totalIncome - totalExpense;
      setMonthlyExpenses(totalExpense);

      const preds = buildPrediction(currentBalance * 1, txs, recRes.data || [], billRes.data || [], 90);
      setPredictions(preds);
      setLoading(false);
    });
  }, [user]);

  const visiblePreds = predictions.slice(0, period);
  const firstNeg = visiblePreds.find(p => p.isNegative);
  const lowestBal = visiblePreds.length > 0 ? Math.min(...visiblePreds.map(p => p.projectedBalance)) : 0;
  const negProb = visiblePreds.length > 0 ? Math.round((visiblePreds.filter(p => p.isNegative).length / visiblePreds.length) * 100) : 0;
  const status = firstNeg ? 'danger' : lowestBal < 500 ? 'warning' : 'good';
  const alerts = useMemo(() => generateAlerts(visiblePreds, monthlyExpenses), [visiblePreds, monthlyExpenses]);

  const allEvents = visiblePreds.flatMap(p => p.events.map(e => ({ ...e, date: p.date })));
  const filteredEvents = allEvents.filter(e => {
    if (filter === 'confirmed') return e.probability > 0.9;
    if (filter === 'estimated') return e.probability <= 0.9;
    if (filter === 'income') return e.amount > 0;
    if (filter === 'expense') return e.amount < 0;
    return true;
  }).slice(0, 30);

  const nextCritical = allEvents.filter(e => e.amount < 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* HERO — Health score + headline metric */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 20,
          padding: 22,
          background: 'linear-gradient(135deg, var(--color-green-600) 0%, var(--color-green-700, #5b21b6) 100%)',
          color: 'white',
          boxShadow: '0 12px 32px -12px rgba(124,58,237,0.45)',
        }}
      >
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              <Sparkles size={11} /> Análise preditiva
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 99,
              background: status === 'danger' ? 'rgba(239,68,68,0.95)' : status === 'warning' ? 'rgba(245,158,11,0.95)' : 'rgba(34,197,94,0.95)',
              fontSize: 10, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase',
            }}>
              <ShieldCheck size={11} /> {status === 'danger' ? 'Risco alto' : status === 'warning' ? 'Atenção' : 'Saudável'}
            </div>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
            Saldo mínimo previsto · {period} dias
          </p>
          <div className="flex items-baseline gap-2" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1.2px', lineHeight: 1 }}>
              {formatCurrency(lowestBal, 'R$')}
            </span>
            {firstNeg && (
              <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>
                em {format(new Date(firstNeg.date), "dd 'de' MMM", { locale: ptBR })}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, opacity: 0.9 }}>
            Seu futuro financeiro com base em dados reais e padrões históricos
          </p>

          {/* Period segmented control */}
          <div style={{
            marginTop: 16, display: 'inline-flex', padding: 4, gap: 4,
            background: 'rgba(0,0,0,0.18)', borderRadius: 12, backdropFilter: 'blur(8px)',
          }}>
            {([30, 60, 90] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: period === p ? 'white' : 'transparent',
                  color: period === p ? 'var(--color-green-700, #5b21b6)' : 'rgba(255,255,255,0.85)',
                  border: 'none', transition: 'all 0.2s',
                }}>
                {p} dias
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Secondary metrics — refined neutral cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MetricCard
          icon={<AlertCircle size={16} />}
          label="Próximo evento crítico"
          value={nextCritical ? nextCritical.description : 'Nada à vista'}
          sub={nextCritical
            ? `${formatCurrency(Math.abs(nextCritical.amount), 'R$')} · em ${differenceInDays(new Date(nextCritical.date), new Date())} ${differenceInDays(new Date(nextCritical.date), new Date()) === 1 ? 'dia' : 'dias'}`
            : 'Nenhum gasto relevante previsto'}
          tone={nextCritical && Math.abs(nextCritical.amount) > 1000 ? 'warning' : 'neutral'}
        />
        <MetricCard
          icon={<Activity size={16} />}
          label="Probabilidade de saldo negativo"
          value={`${negProb}%`}
          sub={`nos próximos ${period} dias`}
          tone={negProb > 50 ? 'danger' : negProb > 20 ? 'warning' : 'success'}
          progress={negProb}
        />
      </div>

      {/* Main chart */}
      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 18, padding: 20 }}>
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.2px' }}>
              Projeção de saldo
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Próximos {period} dias · faixa de confiança sombreada
            </p>
          </div>
          <div className="flex items-center gap-3" style={{ fontSize: 11 }}>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
              <span style={{ width: 10, height: 2, borderRadius: 99, background: status === 'danger' ? '#ef4444' : '#22c55e' }} />
              Saldo
            </span>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
              <span style={{ width: 10, height: 8, borderRadius: 2, background: status === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }} />
              Variação
            </span>
          </div>
        </div>
        <div style={{ height: isMobile ? 220 : 320 }}>
          <Suspense fallback={<div className="skeleton-shimmer w-full h-full" style={{ borderRadius: 12 }} />}>
            <LazyPredChart predictions={visiblePreds} status={status} />
          </Suspense>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} onAction={() => alert.actionPath && navigate(alert.actionPath)} />
          ))}
        </div>
      )}

      {/* Action plan when danger */}
      {status === 'danger' && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 16, padding: 20 }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} style={{ color: 'var(--color-danger-text)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-danger-text)' }}>Plano de ação sugerido</span>
          </div>
          <div className="space-y-2">
            {[
              { priority: 1, title: 'Reduzir gastos variáveis em 30%', effort: '★★☆', label: 'Mais fácil' },
              { priority: 2, title: 'Adiar uma conta para o próximo mês', effort: '★☆☆', label: 'Rápido' },
              { priority: 3, title: 'Usar reserva de emergência', effort: '★★★', label: 'Último recurso' },
            ].map(s => (
              <div key={s.priority} className="flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--color-danger-solid)', color: 'white', padding: '2px 8px', borderRadius: 99 }}>
                  Opção {s.priority}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-strong)' }}>{s.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>{s.effort}</span>
                </div>
                <button onClick={() => navigate('/app/simulator')} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-green-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Simular →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event timeline */}
      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 18, padding: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.2px' }}>Eventos previstos</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'} no período</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'confirmed', 'estimated', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                background: filter === f ? 'var(--color-green-600)' : 'transparent',
                color: filter === f ? 'white' : 'var(--color-text-muted)',
                border: `1px solid ${filter === f ? 'transparent' : 'var(--color-border-base)'}`,
                transition: 'all 0.15s',
              }}>
              {{ all: 'Todos', confirmed: 'Confirmados', estimated: 'Estimados', income: 'Receitas', expense: 'Despesas' }[f]}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          {filteredEvents.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 16, textAlign: 'center' }}>Nenhum evento encontrado</p>
          )}
          {filteredEvents.map((e, i) => (
            <div key={i} className="flex items-center gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-weak)' }}>
              <div style={{ width: 3, height: 24, borderRadius: 99, background: e.amount > 0 ? 'var(--color-success-solid)' : e.probability > 0.9 ? 'var(--color-danger-solid)' : '#3b82f6' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-base)' }}>{e.description}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                  {format(new Date(e.date), 'dd/MM (EEE)', { locale: ptBR })} · {e.category}
                </p>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: e.amount > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)',
              }}>
                {e.amount > 0 ? '+' : ''}{formatCurrency(e.amount, 'R$')}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                background: e.probability > 0.9 ? 'var(--color-success-bg)' : 'var(--color-bg-sunken)',
                color: e.probability > 0.9 ? 'var(--color-success-text)' : 'var(--color-text-muted)',
              }}>
                {Math.round(e.probability * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, tone, progress }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'danger' | 'warning' | 'success' | 'neutral';
  progress?: number;
}) {
  const accent = {
    danger: 'var(--color-danger-solid)',
    warning: '#f59e0b',
    success: 'var(--color-success-solid)',
    neutral: 'var(--color-green-600)',
  }[tone];

  return (
    <div style={{
      position: 'relative',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-base)',
      borderRadius: 16,
      padding: 16,
      overflow: 'hidden',
    }}>
      {/* Accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent, opacity: 0.9,
      }} />
      <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
          color: accent,
        }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.5px', paddingLeft: 6 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, paddingLeft: 6 }}>{sub}</p>}
      {typeof progress === 'number' && (
        <div style={{
          marginTop: 10, marginLeft: 6, height: 4, borderRadius: 99,
          background: 'var(--color-bg-sunken)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, progress)}%`, height: '100%',
            background: accent, borderRadius: 99, transition: 'width 0.6s ease',
          }} />
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onAction }: { alert: PredictionAlert; onAction: () => void }) {
  const colors = {
    danger: { bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)', text: 'var(--color-danger-text)' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    info: { bg: 'var(--color-bg-sunken)', border: 'var(--color-border-base)', text: 'var(--color-text-base)' },
    success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', text: 'var(--color-success-text)' },
  }[alert.type];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 20 }}>{alert.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>{alert.title}</p>
          <p style={{ fontSize: 12, color: colors.text, opacity: 0.85, marginTop: 4 }}>{alert.description}</p>
          {alert.actionLabel && (
            <button onClick={onAction} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--color-green-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {alert.actionLabel} →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

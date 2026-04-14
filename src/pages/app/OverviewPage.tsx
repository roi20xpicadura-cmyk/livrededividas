import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/plans';
import { OBJECTIVES, SMART_TIPS } from '@/lib/objectives';
import { calculateFinancialScore, getScoreColor, getScoreLevel, ScoreData } from '@/lib/financialScore';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Hash, Zap,
  ArrowRight, ArrowUpRight, Lightbulb, X as XIcon,
  PlusCircle, ReceiptText, BarChart2, Target, Check, Flame, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/* ── helpers ───────────────────────────────────────────── */

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(target * ease);
      if (p < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function AnimatedCurrency({ value, currency }: { value: number; currency: string }) {
  const v = useCountUp(value);
  return <>{formatCurrency(v, currency)}</>;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const v = useCountUp(value);
  return <>{suffix ? `${v.toFixed(1)}${suffix}` : Math.round(v)}</>;
}

function ProgressBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.min(pct, 100)), delay); return () => clearTimeout(t); }, [pct, delay]);
  const color = pct < 30 ? 'var(--color-danger-solid)' : pct < 70 ? 'var(--color-warning-solid)' : 'var(--color-green-600)';
  return (
    <div style={{ height: 6, background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 'var(--radius-full)', transition: 'width 800ms ease-out', width: `${w}%`, background: color }} />
    </div>
  );
}

const stagger = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94], delay: i * 0.06 } });

/* ── custom tooltip ────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-[13px] font-bold text-foreground">{formatCurrency(payload[0].value, 'R$')}</p>
    </div>
  );
}

/* ── main ──────────────────────────────────────────────── */

export default function OverviewPage() {
  const { user } = useAuth();
  const { config } = useProfile();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [goalCheckins, setGoalCheckins] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_tips') || '[]'); } catch { return []; }
  });
  const currency = config?.currency || 'R$';
  const profileType = config?.profile_type || 'personal';
  const objectives = config?.financial_objectives || [];

  useEffect(() => {
    if (!user) return;
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('investments').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('goal_checkins').select('*').eq('user_id', user.id).gte('date', weekAgo).order('date', { ascending: true }),
      supabase.from('credit_cards').select('*').eq('user_id', user.id),
      supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
    ]).then(([txRes, invRes, goalRes, ckRes, cardRes, debtRes]) => {
      setTransactions(txRes.data || []);
      setInvestments(invRes.data || []);
      setGoals(goalRes.data || []);
      setCards(cardRes.data || []);
      setDebts(debtRes.data || []);
      const grouped: Record<string, any[]> = {};
      (ckRes.data || []).forEach((ck: any) => {
        if (!grouped[ck.goal_id]) grouped[ck.goal_id] = [];
        grouped[ck.goal_id].push(ck);
      });
      setGoalCheckins(grouped);
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income');
    const expense = transactions.filter(t => t.type === 'expense');
    const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;
    const bizIncome = income.filter(t => t.origin === 'business').reduce((s, t) => s + Number(t.amount), 0);
    const bizExpense = expense.filter(t => t.origin === 'business').reduce((s, t) => s + Number(t.amount), 0);
    const personalIncome = income.filter(t => t.origin === 'personal').reduce((s, t) => s + Number(t.amount), 0);
    const personalExpense = expense.filter(t => t.origin === 'personal').reduce((s, t) => s + Number(t.amount), 0);
    const bizProfit = bizIncome - bizExpense;
    const personalBalance = personalIncome - personalExpense;
    const investTotal = investments.reduce((s, i) => s + Number(i.current_amount), 0);
    const patrimonio = investTotal + Math.max(0, netBalance);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const roiBiz = bizExpense > 0 ? (bizProfit / bizExpense) * 100 : 0;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const avgPerDay = netBalance / daysInMonth;
    return { totalIncome, totalExpense, netBalance, bizIncome, bizExpense, personalExpense, personalIncome, bizProfit, personalBalance, patrimonio, savingsRate, roiBiz, avgPerDay, txCount: transactions.length };
  }, [transactions, investments]);

  /* financial score */
  const scoreResult = useMemo(() => {
    const scoreData: ScoreData = {
      totalIncome: stats.totalIncome,
      totalExpense: stats.totalExpense,
      cards: cards.map(c => ({ used_amount: Number(c.used_amount || 0), credit_limit: Number(c.credit_limit) })),
      goals: goals.map(g => ({ current_amount: Number(g.current_amount || 0), target_amount: Number(g.target_amount) })),
      totalDebt: debts.reduce((s, d) => s + Number(d.remaining_amount), 0),
      investments: investments.map(i => ({ asset_type: i.asset_type })),
      recentTransactionCount: transactions.length,
    };
    return calculateFinancialScore(scoreData);
  }, [stats, cards, goals, debts, investments, transactions]);

  /* chart data */
  const chartData = useMemo(() => {
    const days = chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 90;
    const end = new Date();
    const start = subDays(end, days - 1);
    const interval = eachDayOfInterval({ start, end });
    let running = 0;
    return interval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTxs = transactions.filter(t => t.date === dateStr);
      dayTxs.forEach(t => { running += t.type === 'income' ? Number(t.amount) : -Number(t.amount); });
      return { date: format(day, 'dd/MM'), saldo: running };
    });
  }, [transactions, chartPeriod]);

  const dismissTip = useCallback((key: string) => {
    const next = [...dismissedTips, key];
    setDismissedTips(next);
    localStorage.setItem('dismissed_tips', JSON.stringify(next));
  }, [dismissedTips]);

  const activeTip = objectives.find(k => SMART_TIPS[k] && !dismissedTips.includes(k));

  if (loading) return <Skeleton />;

  const recent = transactions.slice(0, 8);

  const kpis = profileType === 'personal' ? [
    { label: 'Saldo', value: stats.netBalance, icon: TrendingUp, iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-solid)' },
    { label: 'Total Receitas', value: stats.totalIncome, icon: DollarSign, iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-solid)' },
    { label: 'Total Despesas', value: stats.totalExpense, icon: TrendingDown, iconBg: 'var(--color-danger-bg)', iconColor: 'var(--color-danger-solid)' },
    { label: 'Total Guardado', value: Math.max(0, stats.netBalance), icon: DollarSign, iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-solid)' },
    { label: 'Metas Ativas', value: goals.filter(g => Number(g.current_amount) < Number(g.target_amount)).length, icon: Hash, iconBg: 'var(--color-bg-sunken)', iconColor: 'var(--color-text-muted)', isCount: true },
    { label: 'Taxa Poupança', value: stats.savingsRate, icon: Percent, iconBg: '#ede9fe', iconColor: '#7c3aed', isPct: true, bar: Math.min(stats.savingsRate, 100) },
  ] : [
    { label: 'Receita', value: stats.totalIncome, icon: TrendingUp, iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-solid)' },
    { label: 'Custos', value: stats.totalExpense, icon: TrendingDown, iconBg: 'var(--color-danger-bg)', iconColor: 'var(--color-danger-solid)' },
    { label: 'Lucro', value: stats.bizProfit, icon: DollarSign, iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-solid)' },
    { label: 'ROI', value: stats.roiBiz, icon: Percent, iconBg: '#ede9fe', iconColor: '#7c3aed', isPct: true },
    { label: 'Lançamentos', value: stats.txCount, icon: Hash, iconBg: 'var(--color-bg-sunken)', iconColor: 'var(--color-text-muted)', isCount: true },
    { label: 'Média/Dia', value: stats.avgPerDay, icon: Zap, iconBg: 'var(--color-warning-bg)', iconColor: 'var(--color-warning-solid)' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Tip Bar ────────────────────────────────── */}
      {activeTip && (
        <motion.div {...stagger(0)}
          className="flex items-center gap-2.5" style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)',
            borderLeft: '3px solid var(--color-green-600)', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
            padding: '10px 16px',
          }}>
          <Lightbulb style={{ width: 14, height: 14, color: 'var(--color-green-600)', flexShrink: 0 }} />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="label-upper flex-shrink-0" style={{ color: 'var(--color-green-600)' }}>DICA</span>
            <p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-base)' }}>{SMART_TIPS[activeTip]?.replace(/^💡\s*/, '')}</p>
          </div>
          <button onClick={() => dismissTip(activeTip)} className="flex-shrink-0 transition-colors" style={{ color: 'var(--color-text-disabled)' }}>
            <XIcon style={{ width: 12, height: 12 }} />
          </button>
        </motion.div>
      )}

      {/* ── Hero Cards ─────────────────────────────── */}
      {profileType === 'both' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HeroCard type="business" balance={stats.bizProfit} income={stats.bizIncome} expense={stats.bizExpense} currency={currency} delay={1} />
          <HeroCard type="personal" balance={stats.personalBalance} income={stats.personalIncome} expense={stats.personalExpense} currency={currency} delay={2} />
        </div>
      ) : (
        <HeroCard
          type={profileType === 'personal' ? 'personal' : 'business'}
          balance={stats.netBalance}
          income={stats.totalIncome}
          expense={stats.totalExpense}
          currency={currency}
          delay={1}
          single
          stats={profileType === 'business' ? [
            { label: 'Receitas', val: stats.totalIncome, color: 'var(--color-success-solid)' },
            { label: 'Despesas', val: stats.totalExpense, color: 'var(--color-danger-solid)' },
            { label: 'Receita Neg.', val: stats.bizIncome, color: 'var(--color-success-solid)' },
            { label: 'Gasto Neg.', val: stats.bizExpense, color: 'var(--color-danger-solid)' },
          ] : [
            { label: 'Receitas', val: stats.totalIncome, color: 'var(--color-success-solid)' },
            { label: 'Despesas', val: stats.totalExpense, color: 'var(--color-danger-solid)' },
            { label: 'Patrimônio', val: stats.patrimonio, color: 'var(--color-success-solid)' },
            { label: 'Poupança', val: Math.max(0, stats.netBalance), color: 'var(--color-success-solid)' },
          ]}
        />
      )}

      {/* ── KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} {...stagger(i + 3)}
            className="card-premium" style={{ padding: 18 }}>
            <div className="flex items-center justify-between">
              <p className="label-upper">{k.label}</p>
              <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: k.iconBg }}>
                <k.icon style={{ width: 15, height: 15, color: k.iconColor }} />
              </div>
            </div>
            <p className="metric-value" style={{ fontSize: 22, marginTop: 10, lineHeight: 1, color: 'var(--color-text-strong)' }}>
              {k.isCount ? <AnimatedNumber value={k.value} /> : k.isPct ? <AnimatedNumber value={k.value} suffix="%" /> : <AnimatedCurrency value={k.value} currency={currency} />}
            </p>
            {k.bar !== undefined && (
              <div className="mt-2.5">
                <ProgressBar pct={k.bar} delay={400 + i * 100} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Financial Health Score ──────────────────── */}
      <motion.div {...stagger(8)} className="card-premium" style={{ padding: 24 }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
          {/* Left — Score */}
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[1px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Score de Saúde Financeira
            </p>
            <div className="flex items-end gap-3 mt-3">
              <span className="text-[56px] font-black tracking-tighter leading-none" style={{ color: getScoreColor(scoreResult.total) }}>
                <AnimatedNumber value={scoreResult.total} />
              </span>
              <span className="text-[13px] font-bold text-muted-foreground mb-2">/1000</span>
            </div>
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold"
              style={{ background: getScoreColor(scoreResult.total) + '18', color: getScoreColor(scoreResult.total), border: `1px solid ${getScoreColor(scoreResult.total)}40` }}>
              {getScoreLevel(scoreResult.total).emoji} {getScoreLevel(scoreResult.total).label}
            </span>
          </div>

          {/* Right — Breakdown */}
          <div className="space-y-2.5">
            {scoreResult.criteria.map((c, i) => (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">{c.label}</span>
                  <span className="text-[11px] font-bold text-foreground">{c.points}/{c.max}</span>
                </div>
                <div className="h-[5px] bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${(c.points / c.max) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: getScoreColor(scoreResult.total) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tip */}
        {(() => {
          const lowest = [...scoreResult.criteria].sort((a, b) => (a.points / a.max) - (b.points / b.max))[0];
          if (!lowest || lowest.points / lowest.max > 0.7) return null;
          const tips: Record<string, string> = {
            'Taxa de Poupança': 'Aumente sua taxa de poupança reduzindo gastos supérfluos.',
            'Uso do Crédito': 'Reduza o uso do cartão para menos de 30% do limite.',
            'Progresso de Metas': 'Faça depósitos regulares nas suas metas.',
            'Controle de Dívidas': 'Priorize quitar suas dívidas ativas.',
            'Investimentos': 'Diversifique seus investimentos em mais categorias.',
            'Regularidade': 'Registre todos os seus lançamentos diariamente.',
          };
          return (
            <div className="flex items-center gap-2" style={{ marginTop: 16, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--radius-lg)', padding: '10px 14px' }}>
              <Lightbulb style={{ width: 14, height: 14, color: 'var(--color-warning-solid)', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'var(--color-warning-text)', fontWeight: 500 }}>
                <span style={{ fontWeight: 700 }}>O que melhorar:</span> {tips[lowest.label] || `Melhore sua pontuação em ${lowest.label}.`}
              </p>
            </div>
          );
        })()}
      </motion.div>

      {/* ── Balance Chart ──────────────────────────── */}
      <motion.div {...stagger(9)} className="card-premium" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center justify-between px-5 pt-[18px] pb-0">
          <h3 className="text-[15px] font-extrabold text-foreground">Evolução do Saldo</h3>
          <div className="flex items-center gap-1 p-[3px]" style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)', borderRadius: 'var(--radius-lg)' }}>
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setChartPeriod(p)}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600,
                  transition: 'all 150ms',
                  ...(chartPeriod === p ? { background: 'var(--color-green-50)', color: 'var(--color-green-700)', border: '1px solid var(--color-green-200)' } : { color: 'var(--color-text-muted)', border: '1px solid transparent' })
                }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-4 pt-2 h-[200px]">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <BarChart2 className="w-8 h-8 text-border" />
              <p className="text-[12px] text-muted-foreground">Adicione lançamentos para ver o gráfico</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="saldo" stroke="#22c55e" strokeWidth={2.5} fill="url(#greenGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ── Goals Overview ──────────────────────────── */}
      {goals.length > 0 && (
        <motion.div {...stagger(10)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-extrabold text-foreground">Minhas Metas</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #d4edda' }}>
                {goals.filter(g => Number(g.current_amount) >= Number(g.target_amount)).length}/{goals.length} concluídas
              </span>
            </div>
            <Link to="/app/goals" className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {goals.slice(0, 6).map((goal, i) => {
              const obj = OBJECTIVES.find(o => o.key === goal.objective_type);
              const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
              const done = pct >= 100;
              const daysLeft = goal.deadline ? Math.max(0, differenceInDays(parseISO(goal.deadline), new Date())) : null;
              const color = goal.color || '#16a34a';
              const cks = goalCheckins[goal.id] || [];
              // Calculate streak
              let streak = 0;
              for (let d = 0; d < 30; d++) {
                const day = format(subDays(new Date(), d), 'yyyy-MM-dd');
                if (cks.some((c: any) => c.date === day)) streak++;
                else break;
              }

              return (
                <Link to="/app/goals" key={goal.id}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex-shrink-0 w-[240px] min-w-[240px] rounded-[14px] p-[18px] bg-card border-[1.5px] border-border transition-all duration-200 hover:-translate-y-[2px] hover:border-primary/40 cursor-pointer"
                    style={{ borderTopWidth: 4, borderTopColor: done ? '#d97706' : color }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: color + '20', border: `1.5px solid ${color}40` }}>
                        {obj?.emoji || '🎯'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-extrabold text-foreground leading-[1.3] truncate">{goal.name}</p>
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fefce8', color: '#d97706', border: '1px solid #fde68a' }}>
                            <Flame className="w-2.5 h-2.5" /> {streak} dias
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <ProgressBar pct={pct} delay={500 + i * 100} />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[13px] font-extrabold" style={{ color }}>{formatCurrency(Number(goal.current_amount), currency)}</span>
                        <span className="text-[12px] font-bold text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {done ? '🏆 Meta atingida!' : daysLeft !== null ? `${daysLeft} dias restantes` : `Faltam ${formatCurrency(Number(goal.target_amount) - Number(goal.current_amount), currency)}`}
                      </p>
                    </div>

                    {/* Mini 7-day streak */}
                    <div className="flex gap-[3px] mt-2.5">
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const day = subDays(new Date(), 6 - idx);
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const ck = cks.find((c: any) => c.date === dayStr);
                        return (
                          <div key={idx} className="flex-1 h-[6px] rounded-full transition-all"
                            style={{ background: ck ? (Number(ck.amount) > 0 ? color : color + '60') : 'var(--bg-elevated)' }} />
                        );
                      })}
                    </div>
                  </motion.div>
                </Link>
              );
            })}
            {/* CTA to create more */}
            <Link to="/app/goals">
              <div className="flex-shrink-0 w-[180px] min-w-[180px] min-h-[170px] rounded-[14px] p-[18px] bg-card border-[1.5px] border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                <PlusCircle className="w-8 h-8 text-primary" />
                <p className="text-[12px] font-bold text-primary">Nova meta</p>
              </div>
            </Link>
          </div>
        </motion.div>
      )}

      {/* No goals yet — show objectives from onboarding */}
      {goals.length === 0 && objectives.length > 0 && (
        <motion.div {...stagger(10)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-extrabold text-foreground">Seus Objetivos</h3>
            <Link to="/app/goals" className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
              Criar metas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {objectives.map((key, i) => {
              const obj = OBJECTIVES.find(o => o.key === key);
              if (!obj) return null;
              return (
                <Link to="/app/goals" key={key}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex-shrink-0 w-[200px] min-w-[200px] min-h-[120px] rounded-[14px] p-[18px] bg-card border-[1.5px] border-dashed border-border hover:border-primary transition-all cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-secondary">{obj.emoji}</div>
                      <p className="text-[13px] font-extrabold text-foreground leading-tight">{obj.label}</p>
                    </div>
                    <div className="flex flex-col items-center mt-4">
                      <PlusCircle className="w-5 h-5 text-muted-foreground/50" />
                      <p className="text-[11px] font-bold text-primary mt-1">Criar meta</p>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Recent Transactions ────────────────────── */}
      <motion.div {...stagger(11)} className="card-premium overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center justify-between px-5 pt-[18px] pb-3.5 border-b border-border/30">
          <h3 className="text-[15px] font-extrabold text-foreground">Lançamentos Recentes</h3>
          <Link to="/app/transactions" className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-[72px] h-[72px] rounded-full bg-secondary flex items-center justify-center">
              <ReceiptText className="w-8 h-8 text-primary" />
            </div>
            <p className="text-[15px] font-bold text-foreground">Nenhum lançamento ainda</p>
            <p className="text-[13px] text-muted-foreground max-w-[260px] text-center leading-relaxed">Comece adicionando sua primeira receita ou despesa.</p>
            <button onClick={() => navigate('/app/transactions')}
              className="mt-1 inline-flex items-center gap-1.5 text-white transition-colors"
              style={{ padding: '10px 20px', background: 'var(--color-green-600)', borderRadius: 'var(--radius-lg)', fontSize: 13, fontWeight: 700 }}>
              <PlusCircle style={{ width: 16, height: 16 }} /> Adicionar primeiro lançamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-background">
                  <th className="text-left px-5 py-2.5 text-[10px] uppercase tracking-[0.7px] font-bold text-muted-foreground">Data</th>
                  <th className="text-left px-5 py-2.5 text-[10px] uppercase tracking-[0.7px] font-bold text-muted-foreground">Descrição</th>
                  <th className="text-left px-5 py-2.5 text-[10px] uppercase tracking-[0.7px] font-bold text-muted-foreground">Categoria</th>
                  <th className="text-right px-5 py-2.5 text-[10px] uppercase tracking-[0.7px] font-bold text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(tx => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id}
                      className={`border-b border-border/30 hover:bg-accent/50 transition-colors border-l-[3px] ${isIncome ? 'border-l-primary' : 'border-l-destructive'}`}>
                      <td className="px-5 py-3 text-[12px] font-medium text-muted-foreground">
                        {format(parseISO(tx.date), 'dd/MM', { locale: ptBR })}
                      </td>
                      <td className="px-5 py-3 text-[13px] font-bold text-foreground">{tx.description}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-[3px] rounded-full text-[11px] font-bold border ${
                          isIncome ? 'bg-secondary text-accent-foreground border-border' : 'bg-destructive/10 text-destructive border-destructive/30'
                        }`}>{tx.category}</span>
                      </td>
                      <td className={`px-5 py-3 text-right text-[14px] font-black ${isIncome ? 'text-primary' : 'text-destructive'}`}>
                        {isIncome ? '+' : '−'}{formatCurrency(Number(tx.amount), currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Hero Card Component ───────────────────────────── */

function HeroCard({ type, balance, income, expense, currency, delay, single, stats: customStats }: {
  type: 'business' | 'personal';
  balance: number; income: number; expense: number; currency: string;
  delay: number; single?: boolean;
  stats?: { label: string; val: number; color: string }[];
}) {
  const isBiz = type === 'business';
  const label = isBiz ? '💼 NEGÓCIO' : '🏠 PESSOAL';
  const heroLabel = single ? (isBiz ? 'RESULTADO DO NEGÓCIO' : 'SALDO DO MÊS') : undefined;

  const statItems = customStats || [
    { label: 'Receita', val: income, color: 'var(--color-success-solid)' },
    { label: 'Despesas', val: expense, color: 'var(--color-danger-solid)' },
  ];

  return (
    <motion.div {...stagger(delay)}
      className="card-premium relative overflow-hidden" style={{ padding: 24, borderRadius: 'var(--radius-2xl)' }}>
      {/* decorative circles */}
      <div className="absolute -top-[50px] -right-[50px] w-[160px] h-[160px] rounded-full pointer-events-none" style={{ background: isBiz ? 'var(--color-green-100)' : 'var(--color-info-bg)', opacity: 0.5 }} />
      <div className="absolute -bottom-[30px] -left-[20px] w-[100px] h-[100px] rounded-full pointer-events-none" style={{ background: isBiz ? 'var(--color-green-200)' : 'var(--color-info-border)', opacity: 0.3 }} />
      <div className="relative z-[1]">
        <p className="label-upper" style={{ color: isBiz ? 'var(--color-green-600)' : 'var(--color-info-solid)' }}>
          {heroLabel || label}
        </p>
        <p className="metric-value" style={{ fontSize: 36, marginTop: 8, color: balance >= 0 ? 'var(--color-text-strong)' : 'var(--color-danger-solid)' }}>
          <AnimatedCurrency value={balance} currency={currency} />
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <ArrowUpRight style={{ width: 14, height: 14, color: 'var(--color-success-solid)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success-solid)' }}>vs mês anterior</span>
        </div>
        <div className={`grid ${single ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-3 mt-4`}>
          {statItems.map(s => (
            <div key={s.label} style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)', borderRadius: 'var(--radius-lg)', padding: '10px 14px' }}>
              <p className="label-upper">{s.label}</p>
              <p className="metric-value" style={{ fontSize: 16, marginTop: 4, color: s.color }}>{formatCurrency(s.val, currency)}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Skeleton ──────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="skeleton-shimmer" style={{ height: 192, borderRadius: 'var(--radius-2xl)' }} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 96, borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
      <div className="skeleton-shimmer" style={{ height: 240, borderRadius: 'var(--radius-xl)' }} />
      <div className="skeleton-shimmer" style={{ height: 256, borderRadius: 'var(--radius-xl)' }} />
    </div>
  );
}

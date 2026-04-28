import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/plans';
import { OBJECTIVES } from '@/lib/objectives';
import { calculateFinancialScore, getScoreColor, getScoreLevel, ScoreData } from '@/lib/financialScore';
import {
  TrendingUp, TrendingDown, Eye, EyeOff, ChevronDown, Check,
  PlusCircle, Target, Shield, Flame, PiggyBank,
  DollarSign, Percent, Hash, BarChart2, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import TransactionIcon from '@/components/app/TransactionIcon';
// Heavy below-the-fold widgets are lazy-loaded so the dashboard hero paints fast.
// lazyWithRetry: se o chunk falhar (deploy novo, glitch de rede), tenta de novo
// e cai pra null em vez de derrubar a Overview com o ErrorBoundary.
const PredictiveWidget = lazyWithRetry(() => import('@/components/dashboard/PredictiveWidget'));
const AIInsightsWidget = lazyWithRetry(() => import('@/components/dashboard/AIInsightsWidget'));
const WelcomeChecklist = lazyWithRetry(() => import('@/components/app/WelcomeChecklist'));
const PushNotificationOptIn = lazyWithRetry(() => import('@/components/app/PushNotificationOptIn'));
const WhatsAppPromoWidget = lazyWithRetry(() => import('@/components/app/WhatsAppPromoWidget'));
const SmartAlertsWidget = lazyWithRetry(() => import('@/components/dashboard/SmartAlertsWidget'));
import { useIsMobile } from '@/hooks/use-mobile';
import type { Database } from '@/integrations/supabase/types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type InvestmentRow = Database['public']['Tables']['investments']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type CreditCardRow = Database['public']['Tables']['credit_cards']['Row'];
type DebtRow = Database['public']['Tables']['debts']['Row'];

const LazyChart = lazy(() => import('recharts').then(m => ({
  default: ({ data }: { data: { date: string; saldo: number | null }[] }) => (
    <m.ResponsiveContainer width="100%" height="100%">
      <m.AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <m.XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} interval="preserveStartEnd" />
        <m.YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickCount={4} tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
        <m.Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 10, fontSize: 12, fontWeight: 700 }} formatter={(v: number) => [formatCurrency(v, 'R$'), 'Saldo']} />
        <m.Area type="monotone" dataKey="saldo" stroke="#7C3AED" strokeWidth={2.5} fill="url(#balanceGrad)" dot={false} connectNulls={false} activeDot={{ r: 5, fill: '#7C3AED', stroke: 'white', strokeWidth: 2 }} />
      </m.AreaChart>
    </m.ResponsiveContainer>
  )
})));

/* ── helpers ─────────────────────── */
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
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

function getGoalEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/emergência|emergencia|reserva/.test(n)) return '🛡️';
  if (/viagem|férias|ferias|trip/.test(n)) return '✈️';
  if (/casa|apartamento|imóvel|imovel/.test(n)) return '🏠';
  if (/carro|veículo|veiculo/.test(n)) return '🚗';
  if (/casamento|wedding/.test(n)) return '💍';
  if (/faculdade|universidade|estudo/.test(n)) return '🎓';
  if (/dívida|divida|cartão|cartao/.test(n)) return '💳';
  if (/negócio|negocio|empresa/.test(n)) return '💼';
  if (/aposentadoria|pensão/.test(n)) return '👴';
  if (/computador|notebook|celular|tech/.test(n)) return '💻';
  return '🎯';
}

function formatCompact(v: number): string {
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const stagger = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: i * 0.06 } });

/* ── Period Selector ─────────────── */
function PeriodSelector({ period, onPeriodChange }: { period: { month: number; year: number }; onPeriodChange: (m: number, y: number) => void }) {
  const [open, setOpen] = useState(false);
  const label = new Date(period.year, period.month)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5"
        style={{
          height: 30, padding: '0 12px', borderRadius: 99,
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)',
          fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', cursor: 'pointer',
        }}
      >
        <CalendarIcon size={12} style={{ color: 'var(--color-text-subtle)' }} />
        {label}
        <ChevronDown size={11} style={{ color: 'var(--color-text-subtle)' }} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50"
              style={{
                top: 36, right: 0, minWidth: 200,
                background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)',
                borderRadius: 14, padding: 8, boxShadow: 'var(--shadow-lg)',
              }}
            >
              {Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const isActive = d.getMonth() === period.month && d.getFullYear() === period.year;
                return (
                  <button
                    key={i}
                    onClick={() => { onPeriodChange(d.getMonth(), d.getFullYear()); setOpen(false); }}
                    className="w-full flex items-center justify-between"
                    style={{
                      padding: '9px 12px', borderRadius: 9, border: 'none',
                      background: isActive ? 'var(--color-success-bg)' : 'transparent',
                      color: isActive ? 'var(--color-success-text)' : 'var(--color-text-muted)',
                      fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    {d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    {isActive && <Check size={13} style={{ color: 'var(--color-success-text)' }} />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── main ────────────────────────── */
export default function OverviewPage() {
  const { user } = useAuth();
  const { profile, config } = useProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Chat global vive no AppLayout (evita drawer duplicado e bug de "não abre").
  const layoutCtx = useOutletContext<{ openChat?: () => void } | undefined>();
  const openChat = layoutCtx?.openChat ?? (() => {});
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([]);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [cards, setCards] = useState<CreditCardRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const currency = config?.currency || 'R$';
  const profileType = config?.profile_type || 'personal';
  const showPersonal = profileType === 'personal' || profileType === 'both';
  const showBusiness = profileType === 'business' || profileType === 'both';

  const fetchData = useCallback(async (month: number, year: number) => {
    if (!user) {
      setLoading(false);
      return;
    }
    const periodDate = new Date(year, month);
    const start = format(startOfMonth(periodDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(periodDate), 'yyyy-MM-dd');
    // Also fetch last 6 months for chart
    const chartStart = format(startOfMonth(subMonths(periodDate, 5)), 'yyyy-MM-dd');
    try {
      const [txRes, allTxRes, invRes, goalRes, cardRes, debtRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).is('deleted_at', null).order('date', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', chartStart).lte('date', end).is('deleted_at', null),
        supabase.from('investments').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
      ]);

      setTransactions(txRes.data || []);
      setAllTransactions(allTxRes.data || []);
      setInvestments(invRes.data || []);
      setGoals(goalRes.data || []);
      setCards(cardRes.data || []);
      setDebts(debtRes.data || []);
    } catch (error) {
      console.error('[overview] failed to load dashboard data', error);
      setTransactions([]);
      setAllTransactions([]);
      setInvestments([]);
      setGoals([]);
      setCards([]);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData(period.month, period.year);
  }, [fetchData, period.month, period.year]);

  // Refetch when any part of the app emits a transaction-change event
  // (QuickAddFAB, NewTransactionSheet, delete handlers).
  useEffect(() => {
    const handler = () => fetchData(period.month, period.year);
    window.addEventListener('kora:transaction-changed', handler);
    return () => window.removeEventListener('kora:transaction-changed', handler);
  }, [fetchData, period.month, period.year]);

  const handlePeriodChange = (month: number, year: number) => {
    setLoading(true);
    setPeriod({ month, year });
  };

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income');
    const expense = transactions.filter(t => t.type === 'expense');
    const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;
    const bizIncome = income.filter(t => t.origin === 'business').reduce((s, t) => s + Number(t.amount), 0);
    const bizExpense = expense.filter(t => t.origin === 'business').reduce((s, t) => s + Number(t.amount), 0);
    const bizProfit = bizIncome - bizExpense;
    const personalIncome = income.filter(t => t.origin === 'personal').reduce((s, t) => s + Number(t.amount), 0);
    const personalExpense = expense.filter(t => t.origin === 'personal').reduce((s, t) => s + Number(t.amount), 0);
    const personalBalance = personalIncome - personalExpense;
    const investTotal = investments.reduce((s, i) => s + Number(i.current_amount), 0);
    const roiBiz = bizExpense > 0 ? (bizProfit / bizExpense) * 100 : 0;
    return { totalIncome, totalExpense, netBalance, bizIncome, bizExpense, bizProfit, personalIncome, personalExpense, personalBalance, investTotal, roiBiz, txCount: transactions.length };
  }, [transactions, investments]);

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

  const chartData = useMemo(() => {
    const periodDate = new Date(period.year, period.month);
    const months: { date: string; saldo: number | null }[] = [];
    let prevBalance = 0;
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(periodDate, i);
      const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(d), 'yyyy-MM-dd');
      const monthTxs = allTransactions.filter(t => t.date >= mStart && t.date <= mEnd);
      if (monthTxs.length > 0) {
        const bal = monthTxs.reduce((s, t) => s + (t.type === 'income' ? 1 : -1) * Number(t.amount), 0);
        prevBalance = bal;
        months.push({ date: format(d, 'MMM', { locale: ptBR }), saldo: bal });
      } else {
        months.push({ date: format(d, 'MMM', { locale: ptBR }), saldo: prevBalance > 0 ? prevBalance : null });
      }
    }
    return months;
  }, [allTransactions, period]);

  if (loading) return <DashSkeleton />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const rawFirst = profile?.full_name?.split(' ')[0] || '';
  // Capitaliza a inicial do primeiro nome ("klecio" → "Klecio")
  const firstName = rawFirst ? rawFirst.charAt(0).toLocaleUpperCase('pt-BR') + rawFirst.slice(1) : '';

  const heroBalance = profileType === 'personal' ? stats.netBalance
    : profileType === 'business' ? stats.bizProfit
    : stats.netBalance;
  const heroIncome = profileType === 'business' ? stats.bizIncome : stats.totalIncome;
  const heroExpense = profileType === 'business' ? stats.bizExpense : stats.totalExpense;
  const heroLabel = profileType === 'business' ? 'Resultado do negócio' : 'Saldo do mês';

  const activeGoals = goals.filter(g => Number(g.current_amount || 0) < Number(g.target_amount));
  const savedAmount = Math.max(0, stats.netBalance);
  const streak = config?.streak_days || 0;

  // Profile-aware stat cards — unified purple palette w/ accent variations
  const ACCENT_PRIMARY = '#7c3aed';
  const ACCENT_VIOLET = '#a855f7';
  const ACCENT_INDIGO = '#6366f1';
  const ACCENT_FUCHSIA = '#d946ef';
  const ACCENT_AMBER = '#f59e0b';

  const statCards = showPersonal && !showBusiness ? [
    { label: 'Score', value: scoreResult.total, suffix: '/1000', icon: Shield, color: ACCENT_PRIMARY },
    { label: 'Metas ativas', value: activeGoals.length, suffix: '', icon: Target, color: ACCENT_VIOLET },
    { label: 'Streak', value: streak, suffix: ' dias', icon: Flame, color: ACCENT_AMBER },
    { label: 'Economizado', value: savedAmount, prefix: 'R$ ', icon: PiggyBank, color: ACCENT_INDIGO, isCurrency: true },
  ] : showBusiness && !showPersonal ? [
    { label: 'Receita', value: stats.bizIncome, prefix: 'R$ ', icon: TrendingUp, color: ACCENT_PRIMARY, isCurrency: true },
    { label: 'Lucro', value: stats.bizProfit, prefix: 'R$ ', icon: DollarSign, color: ACCENT_VIOLET, isCurrency: true },
    { label: 'ROI', value: stats.roiBiz, suffix: '%', icon: Percent, color: ACCENT_FUCHSIA },
    { label: 'Lançamentos', value: stats.txCount, suffix: '', icon: Hash, color: ACCENT_INDIGO },
  ] : [
    { label: 'Score', value: scoreResult.total, suffix: '/1000', icon: Shield, color: ACCENT_PRIMARY },
    { label: 'Lucro Neg.', value: stats.bizProfit, prefix: 'R$ ', icon: DollarSign, color: ACCENT_VIOLET, isCurrency: true },
    { label: 'Metas ativas', value: activeGoals.length, suffix: '', icon: Target, color: ACCENT_FUCHSIA },
    { label: 'Economizado', value: savedAmount, prefix: 'R$ ', icon: PiggyBank, color: ACCENT_INDIGO, isCurrency: true },
  ];

  const recent = transactions.slice(0, 5);
  const sortedCriteria = [...scoreResult.criteria].sort((a, b) => (a.points / a.max) - (b.points / b.max)).slice(0, 3);

  return (
    <div className="space-y-3 pb-4">
      {/* 1. GREETING + PERIOD SELECTOR */}
      <motion.div {...stagger(0)} className="flex items-center justify-between" style={{ padding: isMobile ? '4px 0' : '0' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 2 }}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </motion.div>

      {/* WELCOME CHECKLIST */}
      <Suspense fallback={null}><WelcomeChecklist /></Suspense>

      {/* PUSH NOTIFICATIONS OPT-IN */}
      <Suspense fallback={null}><PushNotificationOptIn /></Suspense>

      {/* WHATSAPP PROMO */}
      <Suspense fallback={null}><WhatsAppPromoWidget /></Suspense>

      {/* 2. HERO BALANCE CARD */}
      <motion.div {...stagger(1)} className="p-5 md:p-6" style={{
        background: '#1A0D35',
        borderRadius: 22, position: 'relative', overflow: 'hidden',
        border: '1.5px solid rgba(167, 139, 250, 0.20)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        

        <div className="flex items-center justify-between" style={{ marginBottom: 16, position: 'relative' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {heroLabel}
          </span>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowValues(!showValues)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {showValues ? <Eye size={15} color="rgba(255,255,255,0.8)" /> : <EyeOff size={15} color="rgba(255,255,255,0.8)" />}
          </motion.button>
        </div>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          {showValues ? (
            <div>
              <div className="text-[28px] md:text-[38px]" style={{ fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCurrency value={heroBalance} currency={currency} />
              </div>
              <div className="flex items-center gap-1" style={{ marginTop: 8 }}>
                {heroBalance >= 0
                  ? <TrendingUp size={13} color="#A78BFA" />
                  : <TrendingDown size={13} color="#fca5a5" />}
                <span style={{ fontSize: 13, color: heroBalance >= 0 ? '#A78BFA' : '#fca5a5', fontWeight: 600 }}>
                  vs mês anterior
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 38, fontWeight: 900, color: 'white', letterSpacing: '4px' }}>••••••</div>
          )}
        </div>

        {/* Receitas / Despesas — always show */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Receitas</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#DDD6FE', fontVariantNumeric: 'tabular-nums' }}>
              {showValues ? formatCurrency(heroIncome, currency) : '••••'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Despesas</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>
              {showValues ? formatCurrency(heroExpense, currency) : '••••'}
            </div>
          </div>
        </div>

        {/* PESSOAL / NEGÓCIO rows — only for 'both' */}
        {profileType === 'both' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>🏠 Pessoal</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginTop: 2 }}>
                {showValues ? formatCurrency(stats.personalBalance, currency) : '••••'}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' }}>💼 Negócio</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginTop: 2 }}>
                {showValues ? formatCurrency(stats.bizProfit, currency) : '••••'}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* SMART ALERTS */}
      <Suspense fallback={null}><SmartAlertsWidget /></Suspense>

      {/* 3. QUICK STATS — premium 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            {...stagger(i + 2)}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            style={{
              position: 'relative',
              padding: '16px 16px 18px',
              borderRadius: 18,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-weak)',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -16px rgba(124,58,237,0.18)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              minHeight: 128,
            }}
          >
            {/* Top accent bar */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${s.color}, ${s.color}55)`,
                opacity: 0.85,
              }}
            />

            {/* Icon */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${s.color}1f, ${s.color}0a)`,
                border: `1px solid ${s.color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 14px -8px ${s.color}80`,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <s.icon size={18} color={s.color} strokeWidth={2.4} />
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'var(--color-text-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: 'var(--color-text-strong)',
                  letterSpacing: '-0.7px',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.05,
                }}
              >
                {showValues ? (
                  s.isCurrency
                    ? <AnimatedCurrency value={s.value} currency={currency} />
                    : <>{s.prefix || ''}{Math.round(s.value)}{s.suffix || ''}</>
                ) : '••••'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI INSIGHTS */}
      <motion.div {...stagger(6)}>
        <Suspense fallback={null}><AIInsightsWidget onOpenChat={openChat} /></Suspense>
      </motion.div>

      {/* PREDICTIVE AI */}
      <Suspense fallback={null}><PredictiveWidget /></Suspense>

      {/* SCORE CARD — personal only, compact */}
      {showPersonal && (
        (() => {
          const scoreColor = getScoreColor(scoreResult.total);
          const scorePct = Math.min(100, (scoreResult.total / 1000) * 100);
          const RING_SIZE = 96;
          const RING_STROKE = 9;
          const RING_R = (RING_SIZE - RING_STROKE) / 2;
          const RING_C = 2 * Math.PI * RING_R;
          return (
            <motion.div
              {...stagger(7)}
              style={{
                position: 'relative',
                padding: '18px 20px 16px',
                borderRadius: 18,
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-weak)',
                boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -22px rgba(124,58,237,0.22)',
                overflow: 'hidden',
              }}
            >
              {/* Top accent */}
              <div
                aria-hidden
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}55)`,
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 9,
                      background: `linear-gradient(135deg, ${scoreColor}1f, ${scoreColor}0a)`,
                      border: `1px solid ${scoreColor}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Shield size={14} color={scoreColor} strokeWidth={2.4} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-strong)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Score Financeiro
                  </span>
                </div>
                <button
                  onClick={() => navigate('/app/achievements')}
                  style={{
                    fontSize: 12, fontWeight: 800,
                    color: 'hsl(var(--primary))',
                    background: 'hsl(var(--primary) / 0.08)',
                    border: '1px solid hsl(var(--primary) / 0.2)',
                    padding: '4px 10px', borderRadius: 99,
                    cursor: 'pointer',
                  }}
                >
                  Detalhes →
                </button>
              </div>

              {/* Hero: ring + level */}
              <div className="flex items-center gap-5" style={{ marginBottom: 18 }}>
                {/* Circular progress ring */}
                <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
                  <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={scoreColor} />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                      fill="none"
                      stroke="var(--color-bg-sunken)"
                      strokeWidth={RING_STROKE}
                    />
                    <motion.circle
                      cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                      fill="none"
                      stroke="url(#scoreGrad)"
                      strokeWidth={RING_STROKE}
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      initial={{ strokeDashoffset: RING_C }}
                      animate={{ strokeDashoffset: RING_C * (1 - scorePct / 100) }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{
                      fontSize: 28, fontWeight: 900,
                      color: 'var(--color-text-strong)',
                      letterSpacing: '-1px', lineHeight: 1,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {showValues ? Math.round(scoreResult.total) : '•••'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: 'var(--color-text-subtle)',
                      marginTop: 2, fontFamily: 'var(--font-mono)',
                    }}>
                      / 1000
                    </span>
                  </div>
                </div>

                {/* Level + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="inline-flex items-center gap-1.5"
                    style={{
                      padding: '5px 11px', borderRadius: 99,
                      background: `${scoreColor}14`,
                      border: `1px solid ${scoreColor}33`,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor }}>
                      {getScoreLevel(scoreResult.total).label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4, margin: 0 }}>
                    {scoreResult.total >= 800
                      ? 'Sua saúde financeira está excelente. Continue assim!'
                      : scoreResult.total >= 600
                      ? 'Bom progresso! Pequenos ajustes podem te levar ao topo.'
                      : scoreResult.total >= 400
                      ? 'Você está no caminho. Foque nos critérios abaixo.'
                      : 'Vamos juntos melhorar sua saúde financeira.'}
                  </p>
                </div>
              </div>

              {/* Criteria breakdown */}
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--color-border-weak)' }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: 'var(--color-text-subtle)',
                  textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10,
                }}>
                  A melhorar
                </div>
                {sortedCriteria.map(c => {
                  const ratio = c.points / c.max;
                  const barColor = ratio > 0.6 ? '#7C3AED' : ratio > 0.3 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={c.label} className="flex items-center gap-3" style={{ marginBottom: 9 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--color-text-base)', flex: 1, fontWeight: 600 }}>{c.label}</span>
                      <div style={{ width: 90, height: 5, background: 'var(--color-bg-sunken)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(ratio * 100, c.points > 0 ? 6 : 0)}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                          style={{
                            height: '100%', borderRadius: 99,
                            background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: barColor, minWidth: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {c.points}/{c.max}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()
      )}

      {/* CHART */}
      <motion.div
        {...stagger(8)}
        style={{
          position: 'relative',
          padding: '18px 20px 14px',
          borderRadius: 18,
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-weak)',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -22px rgba(124,58,237,0.18)',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, #7C3AED, #a855f7)',
          }}
        />
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="flex items-center gap-2">
            <div style={{
              width: 28, height: 28, borderRadius: 9,
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.06))',
              border: '1px solid hsl(var(--primary) / 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart2 size={14} style={{ color: 'hsl(var(--primary))' }} strokeWidth={2.4} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)' }}>Evolução do saldo</span>
          </div>
          <span
            style={{
              fontSize: 10.5, fontWeight: 700,
              color: 'var(--color-text-muted)',
              padding: '3px 9px', borderRadius: 99,
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border-weak)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}
          >
            6 meses
          </span>
        </div>
        <div style={{ height: 140 }}>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <BarChart2 className="w-8 h-8" style={{ color: 'var(--color-border-base)' }} />
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Adicione lançamentos para ver o gráfico</p>
            </div>
          ) : (
            <Suspense fallback={<div className="skeleton-shimmer w-full h-full" style={{ borderRadius: 8 }} />}>
              <LazyChart data={chartData} />
            </Suspense>
          )}
        </div>
      </motion.div>

      {/* GOALS PREVIEW — personal only */}
      {showPersonal && (
        <motion.div {...stagger(9)}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)' }}>Minhas Metas</span>
            <button onClick={() => navigate('/app/goals')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Ver todas →
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {activeGoals.slice(0, 4).map(goal => {
              const pct = Math.min(100, (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100);
              const obj = OBJECTIVES.find(o => o.key === goal.objective_type);
              // Cinza neutro p/ metas em estágio inicial (0–40%); âmbar p/ andamento; roxo p/ quase lá.
              // Vermelho NÃO é usado em meta saudável — só em estados realmente críticos (não cobertos aqui).
              const barColor = pct >= 75 ? '#7C3AED' : pct >= 40 ? '#f59e0b' : 'var(--color-border-base)';
              const emoji = obj?.emoji || getGoalEmoji(goal.name);
              return (
                <motion.div key={goal.id} whileTap={{ scale: 0.97 }} onClick={() => navigate('/app/goals')}
                  style={{ flexShrink: 0, width: 155, background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)', borderRadius: 14, padding: 14, cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, marginBottom: 10, lineHeight: 1 }}>{emoji}</div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--color-text-base)', marginBottom: 4, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', minHeight: 33,
                  }}>{goal.name}</div>
                  {/* Current / Target */}
                  <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 8, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    R$ {formatCompact(Number(goal.current_amount || 0))}
                    <span style={{ color: 'var(--color-text-disabled)' }}> / R$ {formatCompact(Number(goal.target_amount))}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-bg-sunken)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 99, background: barColor }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: barColor }}>{pct.toFixed(0)}%</span>
                </motion.div>
              );
            })}
            <motion.div whileTap={{ scale: 0.95 }} onClick={() => navigate('/app/goals')}
              style={{ flexShrink: 0, width: 140, background: 'var(--color-bg-sunken)', border: '1.5px dashed var(--color-border-base)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '20px 12px', cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusCircle size={18} color="var(--color-green-600)" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'center' }}>Nova meta</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* RECENT TRANSACTIONS */}
      <motion.div {...stagger(10)}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)' }}>Lançamentos recentes</span>
          <button onClick={() => navigate('/app/transactions')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Ver todos →
          </button>
        </div>
        <div className="card-glow" style={{ overflow: 'hidden' }}>
          {recent.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-subtle)' }}>
              Nenhum lançamento neste período.
              <br />
              <button onClick={() => navigate('/app/transactions')} style={{ color: 'var(--color-green-600)', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: 8, fontSize: 13 }}>
                + Adicionar primeiro lançamento
              </button>
            </div>
          ) : (
            recent.map((tx, i) => (
              <div key={tx.id} className="flex items-center gap-3" style={{ padding: '14px 16px', borderBottom: i < recent.length - 1 ? '0.5px solid var(--color-border-weak)' : 'none' }}>
                <TransactionIcon
                  description={tx.description}
                  category={tx.category}
                  isIncome={tx.type === 'income'}
                  size={40}
                  rounded={12}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                    {format(parseISO(tx.date), 'dd/MM', { locale: ptBR })} · {tx.category}
                  </div>
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 900, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  color: tx.type === 'income' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                }}>
                  {showValues
                    ? `${tx.type === 'income' ? '+' : '-'}${formatCurrency(Number(tx.amount), currency)}`
                    : '••••'}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton-shimmer" style={{ height: 20, width: 180, borderRadius: 8 }} />
      <div className="skeleton-shimmer" style={{ height: 220, borderRadius: 20 }} />
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
      <div className="skeleton-shimmer" style={{ height: 160, borderRadius: 16 }} />
    </div>
  );
}

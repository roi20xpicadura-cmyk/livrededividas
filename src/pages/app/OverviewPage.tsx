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
  DollarSign, Percent, Hash, BarChart2, Calendar as CalendarIcon,
  ArrowDownLeft, ArrowUpRight, Home, Briefcase,
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

      {/* 2. HERO BALANCE CARD — premium */}
      <motion.div {...stagger(1)} className="p-5 md:p-6" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 50%, #4c1d95 100%)',
        borderRadius: 24, position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(167, 139, 250, 0.22)',
        boxShadow:
          '0 24px 60px -16px rgba(76, 29, 149, 0.55), 0 8px 24px -12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        {/* Decorative glow orbs */}
        <div aria-hidden style={{
          position: 'absolute', top: -90, right: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.45), transparent 70%)',
          filter: 'blur(28px)', pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: -100, left: -70,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.38), transparent 70%)',
          filter: 'blur(36px)', pointerEvents: 'none',
        }} />
        {/* Subtle grid texture */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at top right, black 25%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at top right, black 25%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="flex items-center justify-between" style={{ marginBottom: 14, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'rgba(255,255,255,0.10)',
              border: '0.5px solid rgba(255,255,255,0.20)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DollarSign size={15} color="white" strokeWidth={2.4} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.72)',
              textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>
              {heroLabel}
            </span>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowValues(!showValues)}
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '0.5px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 10, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
            }}>
            {showValues ? <Eye size={15} color="rgba(255,255,255,0.85)" /> : <EyeOff size={15} color="rgba(255,255,255,0.85)" />}
          </motion.button>
        </div>

        <div style={{ position: 'relative', marginBottom: 18 }}>
          {showValues ? (
            <div>
              <div style={{
                fontWeight: 900, color: 'white',
                letterSpacing: '-0.035em', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                textShadow: '0 2px 18px rgba(0,0,0,0.30)',
                fontSize: 'clamp(26px, 8.4vw, 42px)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                <AnimatedCurrency value={heroBalance} currency={currency} />
              </div>
              <div className="flex items-center gap-1.5" style={{ marginTop: 10 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px',
                  background: heroBalance >= 0
                    ? 'rgba(167,139,250,0.18)'
                    : 'rgba(252,165,165,0.18)',
                  border: heroBalance >= 0
                    ? '0.5px solid rgba(167,139,250,0.32)'
                    : '0.5px solid rgba(252,165,165,0.32)',
                  borderRadius: 99,
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                }}>
                  {heroBalance >= 0
                    ? <TrendingUp size={11} color="#C4B5FD" strokeWidth={2.6} />
                    : <TrendingDown size={11} color="#fca5a5" strokeWidth={2.6} />}
                  <span style={{
                    fontSize: 11, color: heroBalance >= 0 ? '#DDD6FE' : '#fecaca',
                    fontWeight: 800, letterSpacing: '-0.01em',
                  }}>
                    vs mês anterior
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 42, fontWeight: 900, color: 'white', letterSpacing: '6px' }}>••••••</div>
          )}
        </div>

        {/* Receitas / Despesas — glass card with divider */}
        <div style={{
          position: 'relative',
          display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderRadius: 14, padding: '13px 16px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'rgba(255,255,255,0.6)',
              fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.10em', marginBottom: 5,
            }}>
              <ArrowDownLeft size={10} color="#C4B5FD" strokeWidth={2.8} />
              Receitas
            </div>
            <div style={{
              fontSize: 'clamp(13px, 4.2vw, 16px)',
              fontWeight: 800, color: '#E9D5FF',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {showValues ? formatCurrency(heroIncome, currency) : '••••'}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.10)', margin: '2px 0' }} />
          <div style={{ paddingLeft: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'rgba(255,255,255,0.6)',
              fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.10em', marginBottom: 5,
            }}>
              <ArrowUpRight size={10} color="#fca5a5" strokeWidth={2.8} />
              Despesas
            </div>
            <div style={{
              fontSize: 'clamp(13px, 4.2vw, 16px)',
              fontWeight: 800, color: '#fca5a5',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {showValues ? formatCurrency(heroExpense, currency) : '••••'}
            </div>
          </div>
        </div>

        {/* PESSOAL / NEGÓCIO rows — only for 'both' */}
        {profileType === 'both' && (
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 12, padding: '11px 14px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 10, color: 'rgba(255,255,255,0.55)',
                fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.10em',
              }}>
                <Home size={10} color="rgba(255,255,255,0.65)" strokeWidth={2.6} />
                Pessoal
              </div>
              <div style={{
                fontSize: 'clamp(12px, 4vw, 15px)',
                fontWeight: 800, color: 'white', marginTop: 4,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {showValues ? formatCurrency(stats.personalBalance, currency) : '••••'}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 12, padding: '11px 14px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 10, color: 'rgba(255,255,255,0.55)',
                fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.10em',
              }}>
                <Briefcase size={10} color="rgba(255,255,255,0.65)" strokeWidth={2.6} />
                Negócio
              </div>
              <div style={{
                fontSize: 'clamp(12px, 4vw, 15px)',
                fontWeight: 800, color: 'white', marginTop: 4,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
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
            <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'var(--color-text-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  marginBottom: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: s.isCurrency ? 'clamp(15px, 5vw, 22px)' : 'clamp(17px, 5.6vw, 22px)',
                  fontWeight: 900,
                  color: 'var(--color-text-strong)',
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum"',
                  lineHeight: 1.05,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
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
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div className="flex items-center gap-2">
              <div style={{
                width: 28, height: 28, borderRadius: 9,
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.06))',
                border: '1px solid hsl(var(--primary) / 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Target size={14} style={{ color: 'hsl(var(--primary))' }} strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.2px' }}>
                Minhas Metas
              </span>
            </div>
            <button
              onClick={() => navigate('/app/goals')}
              style={{
                fontSize: 12, fontWeight: 800,
                color: 'hsl(var(--primary))',
                background: 'hsl(var(--primary) / 0.08)',
                border: '1px solid hsl(var(--primary) / 0.2)',
                padding: '5px 11px', borderRadius: 99,
                cursor: 'pointer',
              }}
            >
              Ver todas →
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" style={{ paddingLeft: 1, paddingRight: 1 }}>
            {activeGoals.slice(0, 4).map(goal => {
              const pct = Math.min(100, (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100);
              const obj = OBJECTIVES.find(o => o.key === goal.objective_type);
              const isComplete = pct >= 100;
              const isClose = pct >= 75;
              const isMid = pct >= 40;
              // Roxo da marca em todos os estágios (intensidade muda)
              const barColor = isComplete ? '#22c55e' : isClose ? '#7C3AED' : isMid ? '#a855f7' : '#c4b5fd';
              const labelColor = isComplete ? '#16a34a' : isClose || isMid ? '#7C3AED' : 'var(--color-text-muted)';
              const emoji = obj?.emoji || getGoalEmoji(goal.name);
              return (
                <motion.div
                  key={goal.id}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  onClick={() => navigate('/app/goals')}
                  style={{
                    position: 'relative',
                    flexShrink: 0,
                    width: 168,
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-weak)',
                    borderRadius: 16,
                    padding: 14,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px -16px rgba(124,58,237,0.25)',
                  }}
                >
                  {/* Top accent */}
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${barColor}, ${barColor}55)`,
                    }}
                  />
                  {/* Emoji chip */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: `linear-gradient(135deg, ${barColor}1f, ${barColor}0a)`,
                    border: `1px solid ${barColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, lineHeight: 1, marginBottom: 12,
                  }}>
                    {emoji}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)',
                    marginBottom: 4, lineHeight: 1.3, letterSpacing: '-0.2px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden', minHeight: 34,
                  }}>{goal.name}</div>
                  {/* Current / Target */}
                  <div style={{
                    fontSize: 11, color: 'var(--color-text-muted)',
                    marginBottom: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    R$ {formatCompact(Number(goal.current_amount || 0))}
                    <span style={{ color: 'var(--color-text-disabled)' }}> / R$ {formatCompact(Number(goal.target_amount))}</span>
                  </div>
                  <div style={{
                    height: 6, background: 'var(--color-bg-sunken)',
                    borderRadius: 99, overflow: 'hidden', marginBottom: 6,
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: 99,
                        background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                        boxShadow: pct > 0 ? `0 0 8px ${barColor}80` : 'none',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, fontWeight: 900, color: labelColor, fontVariantNumeric: 'tabular-nums' }}>
                      {pct.toFixed(0)}%
                    </span>
                    {isComplete && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✓ Concluída
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <motion.div
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              onClick={() => navigate('/app/goals')}
              style={{
                flexShrink: 0, width: 130,
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.02))',
                border: '1.5px dashed hsl(var(--primary) / 0.35)',
                borderRadius: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '20px 12px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'linear-gradient(135deg, hsl(var(--primary)), #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 14px -4px hsl(var(--primary) / 0.5)',
              }}>
                <PlusCircle size={20} color="#fff" strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'hsl(var(--primary))', textAlign: 'center', letterSpacing: '-0.1px' }}>
                Nova meta
              </span>
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
                  fontSize: 'clamp(13px, 4vw, 15px)',
                  fontWeight: 900, letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"',
                  flexShrink: 0, whiteSpace: 'nowrap',
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

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, PLAN_LIMITS, type PlanType } from '@/lib/plans';
import { DollarSign, TrendingUp, AlertCircle, PieChart } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type BudgetRow = Database['public']['Tables']['budgets']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { PERSONAL_EXPENSE_CATS, BUSINESS_EXPENSE_CATS } from '@/lib/objectives';

const ALL_EXPENSE_CATS = [...new Set([...PERSONAL_EXPENSE_CATS, ...BUSINESS_EXPENSE_CATS])];

const formatCompact = (v: number): string => {
  if (!v && v !== 0) return 'R$ 0';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 10_000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`;
  if (abs >= 1000) return `R$ ${(v / 1000).toFixed(2).replace('.', ',')}k`;
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
};

const C = {
  violet: '#7C3AED',
  violetSoft: '#F5F3FF',
  violetBorder: '#DDD6FE',
  violetText: '#5B21B6',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  textStrong: '#1A0D35',
  textMuted: '#9CA3AF',
  textBody: '#374151',
  cardBorder: '#F0EEF8',
  trackBg: '#F3F4F6',
  white: '#FFFFFF',
};

export default function BudgetPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const planLimits = PLAN_LIMITS[plan];
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [historyAvg, setHistoryAvg] = useState<Record<string, number>>({});
  const [historyBreakdown, setHistoryBreakdown] = useState<Record<string, Record<string, number>>>({});
  const [auditCategory, setAuditCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSetup, setShowSetup] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});

  const monthYear = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  const fetchData = useCallback(async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const histStart = format(startOfMonth(subMonths(currentMonth, 3)), 'yyyy-MM-dd');
    const histEnd = format(endOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
    const [bRes, tRes, hRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month_year', monthYear),
      supabase.from('transactions').select('*').eq('user_id', user.id).eq('type', 'expense').gte('date', start).lte('date', end),
      supabase.from('transactions').select('category, amount, date').eq('user_id', user.id).eq('type', 'expense').gte('date', histStart).lte('date', histEnd),
    ]);
    setBudgets(bRes.data || []);
    setTransactions(tRes.data || []);
    const catTotals: Record<string, number> = {};
    const breakdown: Record<string, Record<string, number>> = {};
    // Pre-fill 3 prior months as zero so even months without data show up
    const monthKeys: string[] = [];
    for (let i = 3; i >= 1; i--) {
      monthKeys.push(format(subMonths(currentMonth, i), 'yyyy-MM'));
    }
    (hRes.data || []).forEach((t: { category: string; amount: number; date: string }) => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
      const mk = (t.date || '').slice(0, 7);
      if (!breakdown[t.category]) breakdown[t.category] = {};
      breakdown[t.category][mk] = (breakdown[t.category][mk] || 0) + Number(t.amount);
    });
    // Ensure every category has all 3 month keys (even if 0)
    Object.keys(breakdown).forEach(cat => {
      monthKeys.forEach(mk => {
        if (breakdown[cat][mk] === undefined) breakdown[cat][mk] = 0;
      });
    });
    const avg: Record<string, number> = {};
    Object.entries(catTotals).forEach(([cat, total]) => { avg[cat] = Math.ceil((total / 3) * 1.1); });
    setHistoryAvg(avg);
    setHistoryBreakdown(breakdown);
    setLoading(false);
  }, [user, monthYear, currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return map;
  }, [transactions]);

  const budgetCards = useMemo(() => {
    return budgets.map(b => ({
      ...b,
      spent: spentByCategory[b.category] || 0,
      pct: ((spentByCategory[b.category] || 0) / Number(b.limit_amount)) * 100,
    }));
  }, [budgets, spentByCategory]);

  const unbud = useMemo(() => {
    return Object.entries(spentByCategory)
      .filter(([cat]) => !budgets.some(b => b.category === cat))
      .map(([cat, amount]) => ({ category: cat, amount }));
  }, [spentByCategory, budgets]);

  const totalBudget = budgets.reduce((s, b) => s + Number(b.limit_amount), 0);
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
  const overBudgetCount = budgetCards.filter(b => b.pct >= 80).length;
  const categoriesWithSpend = Object.keys(spentByCategory).length;

  const chartData = budgetCards.map(b => ({
    name: b.category.length > 10 ? b.category.slice(0, 10) + '…' : b.category,
    Orçamento: Number(b.limit_amount),
    Gasto: b.spent,
  }));

  const handleSaveBudgets = async () => {
    if (!user) return;
    const existingCount = budgets.length;
    let createdCount = 0;
    for (const [cat, val] of Object.entries(budgetInputs)) {
      const amount = parseFloat(val);
      if (isNaN(amount) || amount <= 0) continue;
      const existing = budgets.find(b => b.category === cat);
      if (existing) {
        await supabase.from('budgets').update({ limit_amount: amount }).eq('id', existing.id);
      } else {
        if (planLimits.budgets !== Infinity && existingCount + createdCount >= planLimits.budgets) {
          toast.error(`Plano ${plan} permite até ${planLimits.budgets} orçamentos. Faça upgrade para criar mais.`);
          break;
        }
        await supabase.from('budgets').insert({ user_id: user.id, category: cat, month_year: monthYear, limit_amount: amount });
        createdCount++;
      }
    }
    toast.success('Orçamento salvo!');
    setShowSetup(false);
    setBudgetInputs({});
    fetchData();
  };

  const openSetup = () => {
    const inputs: Record<string, string> = {};
    budgets.forEach(b => { inputs[b.category] = String(b.limit_amount); });
    setBudgetInputs(inputs);
    setShowSetup(true);
  };

  const handleCopyPrevMonth = async () => {
    if (!user) return;
    const prevMonth = format(subMonths(currentMonth, 1), 'yyyy-MM');
    const { data: prevBudgets } = await supabase.from('budgets').select('*').eq('user_id', user.id).eq('month_year', prevMonth);
    if (!prevBudgets?.length) { toast.error('Nenhum orçamento no mês anterior'); return; }
    for (const b of prevBudgets) {
      await supabase.from('budgets').insert({ user_id: user.id, category: b.category, month_year: monthYear, limit_amount: b.limit_amount });
    }
    toast.success('Orçamento copiado do mês anterior!');
    fetchData();
  };

  const handleUseAverage = async () => {
    if (!user) return;
    const threeMonthsAgo = format(subMonths(currentMonth, 3), 'yyyy-MM-dd');
    const oneMonthAgo = format(subMonths(currentMonth, 1), 'yyyy-MM-dd');
    const { data: recentTx } = await supabase.from('transactions').select('*').eq('user_id', user.id).eq('type', 'expense').gte('date', threeMonthsAgo).lte('date', oneMonthAgo);
    if (!recentTx?.length) { toast.error('Sem dados dos últimos 3 meses'); return; }
    const catTotals: Record<string, number> = {};
    recentTx.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount); });
    for (const [cat, total] of Object.entries(catTotals)) {
      const avg = total / 3;
      const limit = Math.ceil(avg * 1.1);
      await supabase.from('budgets').insert({ user_id: user.id, category: cat, month_year: monthYear, limit_amount: limit });
    }
    toast.success('Orçamento baseado na média criado!');
    fetchData();
  };

  const handleAcceptSuggestion = async (category: string, amount: number) => {
    if (!user || !amount || amount <= 0) return;
    if (planLimits.budgets !== Infinity && budgets.length >= planLimits.budgets) {
      toast.error(`Plano ${plan} permite até ${planLimits.budgets} orçamentos.`);
      return;
    }
    await supabase.from('budgets').insert({ user_id: user.id, category, month_year: monthYear, limit_amount: amount });
    toast.success(`Limite de ${formatCurrency(amount)} definido para ${category}`);
    fetchData();
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return C.red;
    if (pct >= 80) return C.amber;
    return C.violet;
  };

  const getCatEmoji = (cat: string) => {
    const map: Record<string, string> = {
      'Moradia': '🏠', 'Alimentação': '🍕', 'Transporte': '🚗', 'Saúde': '💊',
      'Educação': '📚', 'Lazer': '🎮', 'Roupas': '👕', 'Assinaturas': '📱',
      'Marketing': '📣', 'Software': '💻', 'Impostos': '📋', 'Fornecedor': '📦',
      'Dívidas': '💳', 'Cartão de Crédito': '💳',
    };
    return map[cat] || '📂';
  };

  if (loading) return <div className="p-7"><div className="h-96 rounded-2xl skeleton-shimmer" /></div>;

  const kpis = [
    { label: 'Orçamento', value: formatCompact(totalBudget), Icon: DollarSign, iconBg: C.violetSoft, iconColor: C.violet, valColor: C.violet },
    { label: 'Gasto', value: formatCompact(totalSpent), Icon: TrendingUp, iconBg: C.redSoft, iconColor: C.red, valColor: C.red },
    { label: 'Disponível', value: formatCompact(Math.max(0, totalBudget - totalSpent)), Icon: PieChart, iconBg: C.greenSoft, iconColor: C.green, valColor: C.green },
    { label: 'No limite', value: String(overBudgetCount), Icon: AlertCircle, iconBg: C.amberSoft, iconColor: C.amber, valColor: C.amber },
  ];

  // Combine budgeted + unbudgeted into one unified category list
  const allCategoryRows = [
    ...budgetCards.map(b => ({
      category: b.category,
      spent: b.spent,
      limit: Number(b.limit_amount),
      hasLimit: true,
      pct: b.pct,
      id: b.id,
    })),
    ...unbud.map(u => ({
      category: u.category,
      spent: u.amount,
      limit: 0,
      hasLimit: false,
      pct: 0,
      id: `unbud-${u.category}`,
    })),
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFB' }}>
      <div className="py-5 md:p-7 pb-4 flex flex-col gap-5 max-w-[1400px] mx-auto">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              style={{ width: 32, height: 32, borderRadius: '50%', background: C.violetSoft, border: 'none', color: C.violet, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Mês anterior"
            >‹</button>
            <div style={{ color: C.textStrong, fontSize: 16, fontWeight: 800, textTransform: 'capitalize', minWidth: 110, textAlign: 'center' }}>
              {monthLabel}
            </div>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              style={{ width: 32, height: 32, borderRadius: '50%', background: C.violetSoft, border: 'none', color: C.violet, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Próximo mês"
            >›</button>
          </div>
          <button
            onClick={openSetup}
            style={{ background: C.violet, color: C.white, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + Configurar
          </button>
        </div>

        {/* KPI cards — compact */}
        <div className="grid grid-cols-4 gap-2 px-4">
          {kpis.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: C.white,
                border: `1px solid ${C.cardBorder}`,
                borderRadius: 12,
                padding: '10px 8px 12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                minWidth: 0,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 7, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.Icon style={{ width: 13, height: 13, color: s.iconColor }} />
              </div>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{s.label}</p>
              <p style={{ color: s.valColor, fontSize: 15, fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', letterSpacing: '-0.01em' }} title={s.value}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Empty state OR category list */}
        {budgetCards.length === 0 && unbud.length === 0 ? (
          <div style={{ margin: '0 16px', background: C.white, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: '32px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: C.violetSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
              🎯
            </div>
            <h3 style={{ color: C.textStrong, fontSize: 17, fontWeight: 800, marginBottom: 8 }}>
              Nenhum orçamento definido
            </h3>
            <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Configure limites para cada categoria e controle seus gastos mensais.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <button
                onClick={handleCopyPrevMonth}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F9F8FF', border: '1px solid #EDE9FE', borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <span style={{ fontSize: 18 }}>📋</span>
                <span style={{ color: C.violetText, fontSize: 14, fontWeight: 600 }}>Copiar do mês anterior</span>
              </button>
              <button
                onClick={handleUseAverage}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F9F8FF', border: '1px solid #EDE9FE', borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <span style={{ fontSize: 18 }}>📊</span>
                <span style={{ color: C.violetText, fontSize: 14, fontWeight: 600 }}>Usar média histórica</span>
              </button>
            </div>
            <button
              onClick={openSetup}
              style={{ width: '100%', height: 48, background: C.violet, border: 'none', borderRadius: 12, color: C.white, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              ✏️ Configurar manualmente
            </button>
          </div>
        ) : (
          <div className="px-4">
            {/* Section title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 12 }}>
              <div style={{ color: C.textStrong, fontSize: 15, fontWeight: 800 }}>Categorias</div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>{categoriesWithSpend} com gastos</div>
            </div>

            {/* Category rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {allCategoryRows.map((row, i) => {
                const overspent = row.hasLimit && row.spent > row.limit;
                const pct = row.hasLimit ? Math.min((row.spent / row.limit) * 100, 100) : 0;
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    style={{
                      background: C.white,
                      border: `1px solid ${C.cardBorder}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    {row.hasLimit ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.violetSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                            {getCatEmoji(row.category)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ color: C.textStrong, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.category}
                            </div>
                            <div style={{ color: overspent ? C.red : C.textMuted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {formatCurrency(row.spent)} de {formatCurrency(row.limit)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ color: overspent ? C.red : C.violet, fontSize: 15, fontWeight: 800 }}>
                            {formatCurrency(row.limit)}
                          </div>
                          <div style={{ fontSize: 10, color: overspent ? C.red : C.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            {overspent ? '⚠️ Estourado' : 'limite'}
                            {!overspent && historyAvg[row.category] === row.limit && (
                              <button
                                onClick={() => setAuditCategory(row.category)}
                                title="Limite veio da média dos últimos 3 meses + 10%. Clique para auditar."
                                style={{ background: C.violetSoft, color: C.violetText, border: `1px solid ${C.violetBorder}`, borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}
                              >
                                ✨ histórico
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (() => {
                      const suggested = historyAvg[row.category] || 0;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.violetSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                              {getCatEmoji(row.category)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ color: C.textStrong, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.category}
                              </div>
                              <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 500 }}>
                                {formatCurrency(row.spent)} gasto · sem limite
                              </div>
                            </div>
                          </div>
                          {suggested > 0 ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleAcceptSuggestion(row.category, suggested)}
                                style={{ flex: 1, background: C.violetSoft, border: `1px solid ${C.violetBorder}`, borderRadius: 8, padding: '8px 12px', color: C.violetText, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                title="Sugestão baseada na média dos últimos 3 meses + 10%"
                              >
                                ✨ Usar: {formatCurrency(suggested)}
                              </button>
                              <button
                                onClick={() => setAuditCategory(row.category)}
                                style={{ background: C.white, border: `1px solid ${C.violetBorder}`, borderRadius: 8, padding: '8px 10px', color: C.violet, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                title="Ver como foi calculado"
                                aria-label="Ver detalhes do cálculo"
                              >
                                Detalhes
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setBudgetInputs(prev => ({ ...prev, [row.category]: '' })); setShowSetup(true); }}
                              style={{ background: C.violetSoft, border: `1px solid ${C.violetBorder}`, borderRadius: 8, padding: '8px 12px', color: C.violet, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', width: '100%' }}
                            >
                              + Definir limite
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    {row.hasLimit && (
                      <div style={{ background: C.trackBg, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                          style={{ height: '100%', background: getProgressColor(row.pct), borderRadius: 99 }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="mx-4" style={{ background: C.white, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ color: C.textStrong, fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Orçamento vs Real</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tickFormatter={(v: number) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11, fill: C.textMuted }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: C.textBody }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: C.white, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="Orçamento" fill="#C4B5FD" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Gasto" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.Gasto > entry.Orçamento ? C.red : C.violet} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Audit Modal */}
        <AnimatePresence>
          {auditCategory && (() => {
            const breakdown = historyBreakdown[auditCategory] || {};
            const months = Object.keys(breakdown).sort();
            const total = months.reduce((s, m) => s + (breakdown[m] || 0), 0);
            const avg = months.length > 0 ? total / months.length : 0;
            const buffered = Math.ceil(avg * 1.1);
            const suggested = historyAvg[auditCategory] || buffered;
            const max = Math.max(1, ...months.map(m => breakdown[m] || 0));
            return (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setAuditCategory(null)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] md:max-h-[80vh] z-50 rounded-2xl overflow-y-auto p-6"
                  style={{ background: C.white, border: `1px solid ${C.cardBorder}`, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: C.violetSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {getCatEmoji(auditCategory)}
                      </div>
                      <div>
                        <h3 style={{ color: C.textStrong, fontSize: 16, fontWeight: 800 }}>{auditCategory}</h3>
                        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600 }}>Como calculamos a sugestão</div>
                      </div>
                    </div>
                    <button onClick={() => setAuditCategory(null)} style={{ color: C.textMuted, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>

                  {/* Breakdown bars */}
                  <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {months.length === 0 ? (
                      <div style={{ color: C.textMuted, fontSize: 13, padding: 16, textAlign: 'center', background: '#FAFAFB', borderRadius: 10 }}>
                        Sem histórico para esta categoria.
                      </div>
                    ) : months.map(mk => {
                      const v = breakdown[mk] || 0;
                      const pct = (v / max) * 100;
                      const label = format(new Date(mk + '-01'), 'MMM/yy', { locale: ptBR });
                      return (
                        <div key={mk}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: C.textBody, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{label}</span>
                            <span style={{ color: C.textStrong, fontSize: 12, fontWeight: 700 }}>{formatCurrency(v)}</span>
                          </div>
                          <div style={{ background: C.trackBg, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: C.violet, borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculation summary */}
                  <div style={{ marginTop: 18, padding: 14, background: C.violetSoft, border: `1px solid ${C.violetBorder}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textBody, marginBottom: 6 }}>
                      <span>Total ({months.length}{months.length === 1 ? ' mês' : ' meses'})</span>
                      <span style={{ fontWeight: 700, color: C.textStrong }}>{formatCurrency(total)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textBody, marginBottom: 6 }}>
                      <span>Média mensal</span>
                      <span style={{ fontWeight: 700, color: C.textStrong }}>{formatCurrency(avg)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textBody, marginBottom: 8 }}>
                      <span>Margem de segurança (+10%)</span>
                      <span style={{ fontWeight: 700, color: C.textStrong }}>+ {formatCurrency(buffered - Math.floor(avg))}</span>
                    </div>
                    <div style={{ height: 1, background: C.violetBorder, margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.violetText, fontSize: 13, fontWeight: 700 }}>Sugestão final</span>
                      <span style={{ color: C.violet, fontSize: 18, fontWeight: 800 }}>{formatCurrency(suggested)}</span>
                    </div>
                  </div>

                  {/* Custom override + actions */}
                  <div style={{ marginTop: 14 }}>
                    <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ajustar antes de aceitar (opcional)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: C.textMuted }}>R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={String(suggested)}
                        onChange={e => setBudgetInputs(prev => ({ ...prev, [`__audit_${auditCategory}`]: e.target.value }))}
                        style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 12, fontSize: 14, fontWeight: 700, borderRadius: 10, outline: 'none', background: C.white, border: `1.5px solid ${C.cardBorder}`, color: C.textStrong }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => setAuditCategory(null)}
                      style={{ flex: 1, height: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textBody, background: C.white, border: `1px solid ${C.cardBorder}`, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const override = parseFloat((budgetInputs[`__audit_${auditCategory}`] || '').replace(',', '.'));
                        const finalAmount = !isNaN(override) && override > 0 ? Math.ceil(override) : suggested;
                        const cat = auditCategory;
                        setAuditCategory(null);
                        if (cat) handleAcceptSuggestion(cat, finalAmount);
                      }}
                      style={{ flex: 2, height: 44, borderRadius: 10, fontSize: 13, fontWeight: 800, color: C.white, background: C.violet, border: 'none', cursor: 'pointer' }}
                    >
                      Aceitar e definir limite
                    </button>
                  </div>
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>

        {/* Setup Modal */}
        <AnimatePresence>
          {showSetup && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setShowSetup(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[80vh] z-50 rounded-2xl overflow-y-auto p-6"
                style={{ background: C.white, border: `1px solid ${C.cardBorder}`, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ color: C.textStrong, fontSize: 16, fontWeight: 800, textTransform: 'capitalize' }}>Configurar Orçamento — {monthLabel}</h3>
                  <button onClick={() => setShowSetup(false)} style={{ color: C.textMuted, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
                <div className="space-y-2">
                  {ALL_EXPENSE_CATS.map(cat => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-lg w-6">{getCatEmoji(cat)}</span>
                      <span style={{ color: C.textStrong, fontSize: 14, fontWeight: 600, flex: 1 }}>{cat}</span>
                      <div className="relative w-32">
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: C.textMuted }}>R$</span>
                        <input type="text" inputMode="decimal" pattern="[0-9.,]*" placeholder="0,00"
                          value={budgetInputs[cat] || ''}
                          onChange={e => setBudgetInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                          style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 8, fontSize: 14, fontWeight: 600, borderRadius: 8, outline: 'none', background: C.white, border: `1.5px solid ${C.cardBorder}`, color: C.textStrong }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveBudgets} style={{ width: '100%', marginTop: 16, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 800, color: C.white, background: C.violet, border: 'none', cursor: 'pointer' }}>
                  Salvar Orçamento
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

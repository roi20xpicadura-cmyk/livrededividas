import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/plans';
import {
  DollarSign, TrendingUp, AlertCircle, PieChart, Calendar,
  PlusCircle, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { PERSONAL_EXPENSE_CATS, BUSINESS_EXPENSE_CATS } from '@/lib/objectives';

const ALL_EXPENSE_CATS = [...new Set([...PERSONAL_EXPENSE_CATS, ...BUSINESS_EXPENSE_CATS])];

export default function BudgetPage() {
  const { user } = useAuth();
  const { config } = useProfile();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
    const [bRes, tRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month_year', monthYear),
      supabase.from('transactions').select('*').eq('user_id', user.id).eq('type', 'expense').gte('date', start).lte('date', end),
    ]);
    setBudgets(bRes.data || []);
    setTransactions(tRes.data || []);
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

  const chartData = budgetCards.map(b => ({
    name: b.category.length > 10 ? b.category.slice(0, 10) + '…' : b.category,
    Orçamento: Number(b.limit_amount),
    Gasto: b.spent,
  }));

  const handleSaveBudgets = async () => {
    if (!user) return;
    for (const [cat, val] of Object.entries(budgetInputs)) {
      const amount = parseFloat(val);
      if (isNaN(amount) || amount <= 0) continue;
      const existing = budgets.find(b => b.category === cat);
      if (existing) {
        await supabase.from('budgets').update({ limit_amount: amount }).eq('id', existing.id);
      } else {
        await supabase.from('budgets').insert({ user_id: user.id, category: cat, month_year: monthYear, limit_amount: amount });
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

  const getBarColor = (pct: number) => {
    if (pct >= 100) return '#dc2626';
    if (pct >= 80) return '#f97316';
    if (pct >= 50) return '#d97706';
    return '#7C3AED';
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="px-4 py-5 md:p-7 pb-4 flex flex-col gap-5 max-w-[1400px] mx-auto">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors" style={{ border: '1px solid var(--border-default)' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <span className="text-base font-extrabold capitalize" style={{ color: 'var(--text-primary)' }}>{monthLabel}</span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors" style={{ border: '1px solid var(--border-default)' }}>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          <button onClick={openSetup} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#7C3AED' }}>
            Configurar Orçamento
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Orçamento Total', value: formatCurrency(totalBudget), Icon: DollarSign, iconBg: '#eff6ff', iconColor: '#2563eb', valColor: '#2563eb' },
            { label: 'Total Gasto', value: formatCurrency(totalSpent), Icon: TrendingUp, iconBg: totalSpent > totalBudget ? '#fee2e2' : '#F5F3FF', iconColor: totalSpent > totalBudget ? '#dc2626' : '#7C3AED', valColor: totalSpent > totalBudget ? '#dc2626' : '#7C3AED' },
            { label: 'Disponível', value: formatCurrency(Math.max(0, totalBudget - totalSpent)), Icon: PieChart, iconBg: '#F5F3FF', iconColor: '#7C3AED', valColor: '#7C3AED' },
            { label: 'No Limite', value: String(overBudgetCount), Icon: AlertCircle, iconBg: overBudgetCount > 0 ? '#fee2e2' : 'var(--bg-elevated)', iconColor: overBudgetCount > 0 ? '#dc2626' : '#64748b', valColor: overBudgetCount > 0 ? '#dc2626' : 'var(--text-primary)' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3.5 p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                <s.Icon className="w-[18px] h-[18px]" style={{ color: s.iconColor }} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--text-hint)' }}>{s.label}</p>
                <p className="text-xl font-black" style={{ color: s.valColor }}>{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Budget cards */}
        {budgetCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgetCards.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-[18px] rounded-[14px]" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCatEmoji(b.category)}</span>
                    <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{b.category}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                    background: b.pct >= 100 ? '#fee2e2' : b.pct >= 80 ? '#fff7ed' : b.pct >= 50 ? '#fffbeb' : '#F5F3FF',
                    color: getBarColor(b.pct),
                  }}>{b.pct.toFixed(0)}%</span>
                </div>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-hint)' }}>
                  {formatCurrency(b.spent)} / {formatCurrency(Number(b.limit_amount))}
                </p>
                <div className="mt-3 h-[10px] rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <motion.div initial={{ width: '0%' }} animate={{ width: `${Math.min(b.pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full" style={{ background: getBarColor(b.pct) }} />
                </div>
                <p className="text-xs font-semibold mt-2" style={{ color: b.pct >= 100 ? '#dc2626' : b.pct >= 80 ? '#d97706' : '#7C3AED' }}>
                  {b.pct >= 100 ? `🚨 Limite ultrapassado em ${formatCurrency(b.spent - Number(b.limit_amount))}` :
                   b.pct >= 80 ? `⚠️ Atenção: ${formatCurrency(Number(b.limit_amount) - b.spent)} restantes` :
                   `${formatCurrency(Number(b.limit_amount) - b.spent)} disponíveis`}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <PieChart className="w-12 h-12 mx-auto mb-3" style={{ color: '#C4B5FD' }} />
            <p className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>Nenhum orçamento definido</p>
            <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>Configure limites para cada categoria e controle seus gastos.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
              <button onClick={handleCopyPrevMonth} className="px-4 py-2.5 rounded-lg text-sm font-bold" style={{ border: '1.5px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                📋 Copiar do mês anterior
              </button>
              <button onClick={handleUseAverage} className="px-4 py-2.5 rounded-lg text-sm font-bold" style={{ border: '1.5px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                📊 Usar média histórica
              </button>
              <button onClick={openSetup} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: '#7C3AED' }}>
                ✏️ Configurar manualmente
              </button>
            </div>
          </div>
        )}

        {/* Unbudgeted */}
        {unbud.length > 0 && (
          <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <h3 className="text-sm font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>Sem orçamento definido</h3>
            <div className="space-y-2">
              {unbud.map(u => (
                <div key={u.category} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="flex items-center gap-2">
                    <span>{getCatEmoji(u.category)}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: '#dc2626' }}>{formatCurrency(u.amount)} gasto</span>
                    <button onClick={() => { setBudgetInputs(prev => ({ ...prev, [u.category]: '' })); setShowSetup(true); }}
                      className="text-xs font-bold px-3 py-1 rounded-lg" style={{ color: '#7C3AED', border: '1px solid #d4edda' }}>
                      Definir limite →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="rounded-[14px] p-6" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <h3 className="text-[15px] font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>Orçamento vs Real</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tickFormatter={(v: number) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11, fill: 'var(--text-hint)' }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="Orçamento" fill="#C4B5FD" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Gasto" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.Gasto > entry.Orçamento ? '#dc2626' : '#7C3AED'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Setup Modal */}
        <AnimatePresence>
          {showSetup && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setShowSetup(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[80vh] z-50 rounded-2xl overflow-y-auto p-6"
                style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Configurar Orçamento — {monthLabel}</h3>
                  <button onClick={() => setShowSetup(false)} className="text-lg" style={{ color: 'var(--text-hint)' }}>✕</button>
                </div>
                <div className="space-y-2">
                  {ALL_EXPENSE_CATS.map(cat => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-lg w-6">{getCatEmoji(cat)}</span>
                      <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{cat}</span>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--text-hint)' }}>R$</span>
                        <input type="text" inputMode="decimal" pattern="[0-9.,]*" placeholder="0,00"
                          value={budgetInputs[cat] || ''}
                          onChange={e => setBudgetInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                          className="w-full h-9 pl-8 pr-2 text-sm font-semibold rounded-lg outline-none"
                          style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveBudgets} className="w-full mt-4 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: '#7C3AED' }}>
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

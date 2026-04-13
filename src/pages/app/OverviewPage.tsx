import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency } from '@/lib/plans';
import { TrendingUp, Landmark, Percent, BarChart3, Receipt, CalendarDays, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function OverviewPage() {
  const { user } = useAuth();
  const { config } = useProfile();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = config?.currency || 'R$';

  useEffect(() => {
    if (!user) return;
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('investments').select('*').eq('user_id', user.id),
    ]).then(([txRes, invRes]) => {
      setTransactions(txRes.data || []);
      setInvestments(invRes.data || []);
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
    const personalExpense = expense.filter(t => t.origin === 'personal').reduce((s, t) => s + Number(t.amount), 0);
    const bizProfit = bizIncome - bizExpense;
    const investTotal = investments.reduce((s, i) => s + Number(i.current_amount), 0);
    const patrimonio = investTotal + Math.max(0, netBalance);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const roiBiz = bizExpense > 0 ? (bizProfit / bizExpense) * 100 : 0;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const avgPerDay = netBalance / daysInMonth;
    return { totalIncome, totalExpense, netBalance, bizIncome, personalExpense, bizProfit, patrimonio, savingsRate, roiBiz, avgPerDay, txCount: transactions.length };
  }, [transactions, investments]);

  if (loading) return <Skeleton />;

  const recent = transactions.slice(0, 8);

  const kpis = [
    { label: 'Lucro Negócio', value: formatCurrency(stats.bizProfit), icon: TrendingUp, color: 'text-fin-green', bg: 'bg-fin-green-pale' },
    { label: 'Patrimônio Total', value: formatCurrency(stats.patrimonio), icon: Landmark, color: 'text-fin-blue', bg: 'bg-fin-blue-pale' },
    { label: 'Taxa de Poupança', value: `${stats.savingsRate.toFixed(1)}%`, icon: Percent, color: 'text-fin-green', bg: 'bg-fin-green-pale', bar: Math.min(stats.savingsRate, 100) },
    { label: 'ROI Negócio', value: `${stats.roiBiz.toFixed(1)}%`, icon: BarChart3, color: 'text-fin-purple', bg: 'bg-fin-purple-pale' },
    { label: 'Lançamentos', value: stats.txCount.toString(), icon: Receipt, color: 'text-muted', bg: 'bg-secondary' },
    { label: 'Média/dia', value: formatCurrency(stats.avgPerDay), icon: CalendarDays, color: 'text-fin-amber', bg: 'bg-fin-amber-pale' },
  ];

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-6 bg-fin-green-pale relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-fin-green-border opacity-40" />
        <p className="label-upper text-muted mb-1">Saldo Líquido do Período</p>
        <p className={`text-4xl metric-value ${stats.netBalance >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{formatCurrency(stats.netBalance)}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Total Receitas', val: stats.totalIncome, cls: 'text-fin-green' },
            { label: 'Total Despesas', val: stats.totalExpense, cls: 'text-fin-red' },
            { label: 'Receita Negócio', val: stats.bizIncome, cls: 'text-fin-green' },
            { label: 'Gasto Pessoal', val: stats.personalExpense, cls: 'text-fin-red' },
          ].map(s => (
            <div key={s.label}>
              <p className="label-upper text-muted">{s.label}</p>
              <p className={`text-lg metric-value ${s.cls}`}>{formatCurrency(s.val)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-surface p-4">
            <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="label-upper text-muted">{k.label}</p>
            <p className={`text-lg metric-value ${k.color}`}>{k.value}</p>
            {k.bar !== undefined && (
              <div className="mt-1.5 h-1.5 bg-fin-green-border rounded-full overflow-hidden">
                <div className="h-full bg-fin-green rounded-full transition-all duration-500" style={{ width: `${k.bar}%` }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="card-surface">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-[13px] font-extrabold text-fin-green-dark">Lançamentos Recentes</h3>
          <Link to="/app/transactions" className="flex items-center gap-1 text-xs font-semibold text-fin-green hover:underline">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-2 label-upper text-muted">Data</th>
              <th className="text-left px-4 py-2 label-upper text-muted">Descrição</th>
              <th className="text-left px-4 py-2 label-upper text-muted">Categoria</th>
              <th className="text-right px-4 py-2 label-upper text-muted">Valor</th>
            </tr></thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted text-sm">Nenhum lançamento no período</td></tr>
              ) : recent.map(tx => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-secondary/50 transition-colors border-l-2 ${tx.type === 'income' ? 'border-l-fin-green' : 'border-l-fin-red'}`}>
                  <td className="px-4 py-2.5 font-medium">{format(parseISO(tx.date), 'dd/MM', { locale: ptBR })}</td>
                  <td className="px-4 py-2.5">{tx.description}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold">{tx.category}</span></td>
                  <td className={`px-4 py-2.5 text-right metric-value ${tx.type === 'income' ? 'text-fin-green' : 'text-fin-red'}`}>
                    {tx.type === 'expense' ? '−' : '+'}{formatCurrency(Number(tx.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="card-surface p-6 h-48 animate-pulse bg-fin-green-pale" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card-surface p-4 h-24 animate-pulse" />)}
      </div>
      <div className="card-surface p-4 h-64 animate-pulse" />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ChevronRight, AlertTriangle, CreditCard, CalendarClock, TrendingDown, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/plans';
import { format, addDays, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type BillRow = Database['public']['Tables']['scheduled_bills']['Row'];
type BudgetRow = Database['public']['Tables']['budgets']['Row'];
type TxRow = Database['public']['Tables']['transactions']['Row'];
type CardRow = Database['public']['Tables']['credit_cards']['Row'];
type DebtRow = Database['public']['Tables']['debts']['Row'];

interface SmartAlert {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

const alertStyles: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  danger: { bg: 'var(--color-danger-bg)', border: 'hsl(0 72% 51% / 0.2)', text: 'var(--color-danger-text)', iconBg: 'hsl(0 72% 51% / 0.12)' },
  warning: { bg: 'hsl(45 93% 47% / 0.08)', border: 'hsl(45 93% 47% / 0.2)', text: 'hsl(32 95% 44%)', iconBg: 'hsl(45 93% 47% / 0.12)' },
  info: { bg: 'hsl(217 91% 60% / 0.06)', border: 'hsl(217 91% 60% / 0.15)', text: 'hsl(217 91% 40%)', iconBg: 'hsl(217 91% 60% / 0.1)' },
  success: { bg: 'var(--color-success-bg)', border: 'hsl(142 71% 45% / 0.2)', text: 'var(--color-success-text)', iconBg: 'hsl(142 71% 45% / 0.12)' },
};

export default function SmartAlertsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState<BillRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    const soon = format(addDays(now, 7), 'yyyy-MM-dd');
    const today = format(now, 'yyyy-MM-dd');

    Promise.all([
      supabase.from('scheduled_bills').select('*').eq('user_id', user.id).eq('status', 'pending').lte('due_date', soon).gte('due_date', today).order('due_date'),
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month_year', format(now, 'yyyy-MM')),
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).is('deleted_at', null),
      supabase.from('credit_cards').select('*').eq('user_id', user.id),
      supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
    ]).then(([billsRes, budgetsRes, txRes, cardsRes, debtsRes]) => {
      setBills(billsRes.data || []);
      setBudgets(budgetsRes.data || []);
      setTransactions(txRes.data || []);
      setCards(cardsRes.data || []);
      setDebts(debtsRes.data || []);
      setLoading(false);
    });
  }, [user]);

  const alerts = useMemo<SmartAlert[]>(() => {
    const result: SmartAlert[] = [];
    const now = new Date();

    // 1. Bills due soon
    bills.forEach(bill => {
      const days = differenceInDays(parseISO(bill.due_date), now);
      if (days <= 3) {
        result.push({
          id: `bill-${bill.id}`,
          type: days <= 1 ? 'danger' : 'warning',
          emoji: '📅',
          icon: <CalendarClock size={14} />,
          title: days <= 0 ? `"${bill.description}" vence hoje!` : `"${bill.description}" vence em ${days} dia${days > 1 ? 's' : ''}`,
          description: `${formatCurrency(Number(bill.amount), 'R$')} · ${bill.category}`,
          actionLabel: 'Ver contas',
          actionPath: '/app/transactions',
        });
      } else {
        result.push({
          id: `bill-${bill.id}`,
          type: 'info',
          emoji: '📋',
          icon: <CalendarClock size={14} />,
          title: `"${bill.description}" vence em ${days} dias`,
          description: `${formatCurrency(Number(bill.amount), 'R$')}`,
        });
      }
    });

    // 2. Budget alerts
    const expensesByCategory: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
    });

    budgets.forEach(budget => {
      const spent = expensesByCategory[budget.category] || 0;
      const pct = (spent / Number(budget.limit_amount)) * 100;
      if (pct >= 100) {
        result.push({
          id: `budget-over-${budget.id}`,
          type: 'danger',
          emoji: '🚨',
          icon: <AlertTriangle size={14} />,
          title: `Orçamento de "${budget.category}" estourou!`,
          description: `${formatCurrency(spent, 'R$')} de ${formatCurrency(Number(budget.limit_amount), 'R$')} (${pct.toFixed(0)}%)`,
          actionLabel: 'Ver orçamento',
          actionPath: '/app/budget',
        });
      } else if (pct >= 80) {
        result.push({
          id: `budget-warn-${budget.id}`,
          type: 'warning',
          emoji: '⚠️',
          icon: <AlertTriangle size={14} />,
          title: `"${budget.category}" atingiu ${pct.toFixed(0)}% do limite`,
          description: `Restam ${formatCurrency(Number(budget.limit_amount) - spent, 'R$')}`,
          actionLabel: 'Ver orçamento',
          actionPath: '/app/budget',
        });
      }
    });

    // 3. Credit card limit alerts
    cards.forEach(card => {
      const used = Number(card.used_amount || 0);
      const limit = Number(card.credit_limit);
      if (limit > 0) {
        const pct = (used / limit) * 100;
        if (pct >= 90) {
          result.push({
            id: `card-${card.id}`,
            type: 'danger',
            emoji: '💳',
            icon: <CreditCard size={14} />,
            title: `Cartão "${card.name}" no limite!`,
            description: `${pct.toFixed(0)}% utilizado · ${formatCurrency(limit - used, 'R$')} disponível`,
            actionLabel: 'Ver cartão',
            actionPath: '/app/cards',
          });
        } else if (pct >= 70) {
          result.push({
            id: `card-${card.id}`,
            type: 'warning',
            emoji: '💳',
            icon: <CreditCard size={14} />,
            title: `Cartão "${card.name}" com ${pct.toFixed(0)}% usado`,
            description: `${formatCurrency(limit - used, 'R$')} disponível`,
          });
        }
      }

      // Card due date alert
      if (card.due_day) {
        const today = now.getDate();
        const daysUntilDue = card.due_day >= today ? card.due_day - today : 0;
        if (daysUntilDue > 0 && daysUntilDue <= 3 && used > 0) {
          result.push({
            id: `card-due-${card.id}`,
            type: 'warning',
            emoji: '🔔',
            icon: <Bell size={14} />,
            title: `Fatura do "${card.name}" vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`,
            description: `Valor usado: ${formatCurrency(used, 'R$')}`,
            actionLabel: 'Ver cartão',
            actionPath: '/app/cards',
          });
        }
      }
    });

    // 4. Negative cash flow warning
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    if (totalExpense > totalIncome && totalIncome > 0) {
      result.push({
        id: 'cashflow-negative',
        type: 'danger',
        emoji: '📉',
        icon: <TrendingDown size={14} />,
        title: 'Gastos maiores que receitas este mês',
        description: `Déficit de ${formatCurrency(totalExpense - totalIncome, 'R$')}`,
        actionLabel: 'Ver fluxo',
        actionPath: '/app/charts',
      });
    }

    // 5. High debt warning
    const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0);
    if (totalDebt > 0 && totalIncome > 0 && totalDebt > totalIncome * 3) {
      result.push({
        id: 'debt-high',
        type: 'warning',
        emoji: '🏦',
        icon: <Wallet size={14} />,
        title: 'Endividamento alto',
        description: `Dívidas somam ${formatCurrency(totalDebt, 'R$')} (${(totalDebt / totalIncome).toFixed(1)}x sua receita mensal)`,
        actionLabel: 'Ver dívidas',
        actionPath: '/app/debts',
      });
    }

    // Sort: danger first, then warning, then info
    const order = { danger: 0, warning: 1, info: 2, success: 3 };
    result.sort((a, b) => order[a.type] - order[b.type]);

    return result;
  }, [bills, budgets, transactions, cards, debts]);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)', borderRadius: 16, padding: 16 }}>
        <div className="skeleton-shimmer" style={{ height: 20, width: 160, borderRadius: 8, marginBottom: 12 }} />
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 56, borderRadius: 10 }} />)}
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)', borderRadius: 16, overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '14px 16px 0' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(245,158,11,0.25)',
          }}>
            <Bell className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-base)' }}>Alertas Inteligentes</span>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
            background: visibleAlerts.some(a => a.type === 'danger') ? 'hsl(0 72% 51% / 0.1)' : 'hsl(45 93% 47% / 0.1)',
            color: visibleAlerts.some(a => a.type === 'danger') ? '#dc2626' : '#d97706',
          }}>
            {visibleAlerts.length}
          </span>
        </div>
      </div>

      {/* Alerts */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence>
          {visibleAlerts.slice(0, 5).map((alert) => {
            const style = alertStyles[alert.type];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-start gap-2.5"
                style={{
                  padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${style.border}`, background: style.bg,
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{alert.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: style.text, lineHeight: 1.3 }}>{alert.title}</p>
                  <p style={{ fontSize: 11, color: style.text, opacity: 0.75, lineHeight: 1.4, marginTop: 2 }}>{alert.description}</p>
                </div>
                <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
                  {alert.actionLabel && alert.actionPath && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => navigate(alert.actionPath!)}
                      style={{
                        fontSize: 10, fontWeight: 700, color: style.text,
                        border: `1px solid ${style.border}`, borderRadius: 8,
                        padding: '4px 8px', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 2,
                      }}
                    >
                      {alert.actionLabel}
                      <ChevronRight size={10} />
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: 'rgba(0,0,0,0.05)', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X style={{ width: 10, height: 10, color: style.text, opacity: 0.5 }} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from '@/components/app/BottomSheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Plus, ChevronDown, ChevronRight, Zap, Pencil, Check, Trash2,
  MoreVertical, Pause, Play, AlertTriangle, DollarSign, Sparkles,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/* ─── Types ─── */
interface Debt {
  id: string; user_id: string; name: string; creditor: string;
  total_amount: number; remaining_amount: number; interest_rate: number;
  min_payment: number; due_day: number | null; debt_type: string;
  priority: number; status: string; strategy: string; color: string;
  notes: string | null; created_at: string;
}
interface DebtPayment {
  id: string; user_id: string; debt_id: string; amount: number;
  payment_date: string; notes: string | null; created_at: string;
}

const DEBT_TYPES = [
  { val: 'credit_card', label: 'Cartão de Crédito', emoji: '💳', suggestedRate: '15' },
  { val: 'personal_loan', label: 'Empréstimo Pessoal', emoji: '🏦', suggestedRate: '8' },
  { val: 'bank_loan', label: 'Empréstimo Bancário', emoji: '🏛️', suggestedRate: '3' },
  { val: 'overdraft', label: 'Cheque Especial', emoji: '📊', suggestedRate: '12' },
  { val: 'friend_family', label: 'Amigos/Família', emoji: '👥', suggestedRate: '0' },
  { val: 'store_credit', label: 'Crediário/Loja', emoji: '🏪', suggestedRate: '5' },
  { val: 'medical', label: 'Dívida Médica', emoji: '🏥', suggestedRate: '2' },
  { val: 'tax', label: 'Impostos/Multas', emoji: '📋', suggestedRate: '1' },
  { val: 'other', label: 'Outra', emoji: '🔄', suggestedRate: '0' },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtCompact = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace('.0', '')}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.0', '')}k`;
  return v.toFixed(0);
};

function calculateMonthsToFree(remaining: number, monthlyRate: number, monthlyPayment: number): number | null {
  if (monthlyPayment <= 0 || remaining <= 0) return null;
  if (monthlyRate <= 0) return Math.ceil(remaining / monthlyPayment);
  // Check if payment covers interest
  const monthlyInterest = remaining * monthlyRate;
  if (monthlyPayment <= monthlyInterest) return null; // Can never pay off
  let rem = remaining;
  for (let m = 1; m <= 360; m++) {
    const interest = rem * monthlyRate;
    rem = rem + interest - monthlyPayment;
    if (rem <= 0) return m;
  }
  return null;
}

export default function DebtsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [addingDebt, setAddingDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentModal, setPaymentModal] = useState<Debt | null>(null);

  // Form
  const [formType, setFormType] = useState('credit_card');
  const [formName, setFormName] = useState('');
  const [formCreditor, setFormCreditor] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formRemaining, setFormRemaining] = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formMinPayment, setFormMinPayment] = useState('');
  const [formShowMore, setFormShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [dRes, pRes] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', user.id).is('deleted_at', null).order('priority', { ascending: true }),
      supabase.from('debt_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
    ]);
    setDebts((dRes.data as Debt[]) || []);
    setPayments((pRes.data as DebtPayment[]) || []);
    const { data: config } = await supabase.from('user_config').select('debt_strategy').eq('user_id', user.id).single();
    if (config?.debt_strategy === 'snowball') setStrategy('snowball');
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeDebts = debts.filter(d => d.status === 'active');
  const paidDebts = debts.filter(d => d.status === 'paid');
  const totalRemaining = activeDebts.reduce((s, d) => s + Number(d.remaining_amount), 0);
  const monthlyInterest = activeDebts.reduce((s, d) => s + Number(d.remaining_amount) * Number(d.interest_rate || 0) / 100, 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const orderedDebts = useMemo(() => {
    const a = [...activeDebts];
    if (strategy === 'snowball') a.sort((x, y) => Number(x.remaining_amount) - Number(y.remaining_amount));
    else a.sort((x, y) => Number(y.interest_rate) - Number(x.interest_rate));
    return a;
  }, [activeDebts, strategy]);

  // Fixed payoff calculation
  const payoffInfo = useMemo(() => {
    const validDebts = activeDebts.filter(d => Number(d.interest_rate) > 0 && Number(d.min_payment) > 0);
    if (validDebts.length === 0) return null;

    const sorted = [...validDebts];
    if (strategy === 'snowball') sorted.sort((a, b) => Number(a.remaining_amount) - Number(b.remaining_amount));
    else sorted.sort((a, b) => Number(b.interest_rate) - Number(a.interest_rate));

    let months = 0;
    let totalInterestPaid = 0;
    let remaining = sorted.map(d => ({
      rem: Number(d.remaining_amount),
      rate: Number(d.interest_rate) / 100,
      min: Number(d.min_payment),
    }));

    while (remaining.length > 0 && months < 360) {
      months++;
      // Check if any debt's payment doesn't cover interest
      const stuck = remaining.some(d => d.min <= d.rem * d.rate);
      if (stuck && months === 1) return { months: null, totalInterest: 0, warning: true };

      for (const d of remaining) {
        const interest = d.rem * d.rate;
        totalInterestPaid += interest;
        d.rem = d.rem + interest - d.min;
      }
      // Remove paid debts, redirect payments
      const paid = remaining.filter(d => d.rem <= 0);
      if (paid.length > 0) {
        const extra = paid.reduce((s, d) => s + d.min, 0);
        remaining = remaining.filter(d => d.rem > 0);
        if (remaining.length > 0) remaining[0].min += extra;
      }
    }

    if (remaining.length > 0) return { months: null, totalInterest: totalInterestPaid, warning: true };

    const freedomDate = new Date();
    freedomDate.setMonth(freedomDate.getMonth() + months);
    return { months, totalInterest: totalInterestPaid, warning: false, freedomDate };
  }, [activeDebts, strategy]);

  const missingDataDebts = activeDebts.filter(d => !Number(d.interest_rate) || !Number(d.min_payment));

  const handleStrategyChange = async (s: 'snowball' | 'avalanche') => {
    setStrategy(s);
    if (user) await supabase.from('user_config').update({ debt_strategy: s }).eq('user_id', user.id);
  };

  const suggestRate = (name: string) => {
    const n = name.toLowerCase();
    if (/cart[aã]o|nubank|inter|c6|itau|bradesco/.test(n)) return '15';
    if (/consignado/.test(n)) return '2';
    if (/pessoal|empréstimo|emprestimo/.test(n)) return '8';
    if (/cheque especial|especial/.test(n)) return '12';
    if (/financiamento/.test(n)) return '1.5';
    return '';
  };

  const resetForm = () => {
    setFormName(''); setFormCreditor(''); setFormTotal(''); setFormRemaining('');
    setFormInterest(''); setFormMinPayment(''); setFormType('credit_card'); setFormShowMore(false);
  };

  const openEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setFormName(debt.name);
    setFormCreditor(debt.creditor);
    setFormTotal(String(debt.total_amount));
    setFormRemaining(String(debt.remaining_amount));
    setFormInterest(String(debt.interest_rate || ''));
    setFormMinPayment(String(debt.min_payment || ''));
    setFormType(debt.debt_type);
    setFormShowMore(true);
    setAddingDebt(true);
  };

  const handleSaveDebt = async () => {
    if (!user || !formName || !formTotal) return;
    setSubmitting(true);

    if (editingDebt) {
      const { error } = await supabase.from('debts').update({
        name: formName,
        creditor: formCreditor || formName,
        total_amount: parseFloat(formTotal),
        remaining_amount: parseFloat(formRemaining || formTotal),
        interest_rate: parseFloat(formInterest || '0'),
        min_payment: parseFloat(formMinPayment || '0'),
        debt_type: formType,
      }).eq('id', editingDebt.id);
      setSubmitting(false);
      if (error) { toast.error('Erro ao salvar'); return; }
      toast.success('Dívida atualizada!');
    } else {
      const { error } = await supabase.from('debts').insert({
        user_id: user.id, name: formName, creditor: formCreditor || formName,
        total_amount: parseFloat(formTotal),
        remaining_amount: parseFloat(formRemaining || formTotal),
        interest_rate: parseFloat(formInterest || '0'),
        min_payment: parseFloat(formMinPayment || '0'),
        debt_type: formType, color: '#dc2626', strategy, priority: debts.length,
      });
      setSubmitting(false);
      if (error) { toast.error('Erro ao cadastrar dívida'); return; }
      toast.success('Dívida cadastrada!');
    }
    resetForm(); setEditingDebt(null); setAddingDebt(false); fetchData();
  };

  const handlePayment = async () => {
    if (!user || !paymentModal || !payAmount) return;
    setPaySubmitting(true);
    const amount = parseFloat(payAmount);
    const newRemaining = Math.max(0, Number(paymentModal.remaining_amount) - amount);
    const newStatus = newRemaining <= 0 ? 'paid' : 'active';
    const [payRes, updRes] = await Promise.all([
      supabase.from('debt_payments').insert({
        user_id: user.id, debt_id: paymentModal.id, amount,
        payment_date: payDate, notes: payNotes || null,
      }),
      supabase.from('debts').update({ remaining_amount: newRemaining, status: newStatus }).eq('id', paymentModal.id),
    ]);
    setPaySubmitting(false);
    if (payRes.error || updRes.error) { toast.error('Erro ao registrar pagamento'); return; }
    if (newStatus === 'paid') {
      confetti({ particleCount: 200, spread: 90, colors: ['#7C3AED', '#22c55e', '#d97706', '#ffffff'] });
      toast.success(`🏆 ${paymentModal.name} quitada!`, { duration: 4000 });
    } else {
      toast.success(`✓ Pagamento de ${fmt(amount)} registrado!`);
    }
    setPaymentModal(null); setPayAmount(''); setPayNotes(''); fetchData();
  };

  const handleDeleteDebt = async (id: string) => {
    await supabase
      .from('debts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    toast.success('Dívida excluída'); fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (status === 'paid') confetti({ particleCount: 200, spread: 90, colors: ['#7C3AED', '#22c55e', '#d97706', '#ffffff'] });
    await supabase.from('debts').update({ status }).eq('id', id);
    toast.success(status === 'paid' ? '🏆 Dívida quitada!' : status === 'paused' ? 'Dívida pausada' : 'Dívida reativada');
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-5" style={{ maxWidth: 640, margin: '0 auto' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: i === 1 ? 140 : i === 2 ? 100 : 80, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  /* ─── STATE A: No debts ─── */
  if (debts.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20, minHeight: '70vh' }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, var(--success-bg), rgba(139, 92, 246,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🛡️</div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.03em', marginBottom: 8 }}>Sem dívidas cadastradas</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            Cadastre suas dívidas e a KoraFinance vai criar um plano personalizado para você se livrar delas.
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAddingDebt(true)}
          style={{ height: 48, padding: '0 28px', background: 'var(--color-green-600)', border: 'none', borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-green)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Cadastrar primeira dívida
        </motion.button>
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', borderRadius: 14, padding: '14px 16px', maxWidth: 320, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>💡 Por que cadastrar?</div>
          <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', lineHeight: 1.6 }}>
            Com todas as dívidas cadastradas, calculamos a estratégia mais rápida e econômica para você quitar tudo.
          </p>
        </div>
        <AddDebtSheet open={addingDebt} onClose={() => { setAddingDebt(false); resetForm(); setEditingDebt(null); }}
          formType={formType} setFormType={setFormType} formName={formName} setFormName={(v) => { setFormName(v); const r = suggestRate(v); if (r && !formInterest) setFormInterest(r); }}
          formCreditor={formCreditor} setFormCreditor={setFormCreditor} formTotal={formTotal} setFormTotal={setFormTotal}
          formRemaining={formRemaining} setFormRemaining={setFormRemaining} formInterest={formInterest} setFormInterest={setFormInterest}
          formMinPayment={formMinPayment} setFormMinPayment={setFormMinPayment} formShowMore={formShowMore} setFormShowMore={setFormShowMore}
          submitting={submitting} onSubmit={handleSaveDebt} isEditing={!!editingDebt}
        />
      </div>
    );
  }

  /* ─── STATE C: All debts paid ─── */
  if (activeDebts.length === 0 && paidDebts.length > 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20, minHeight: '70vh' }}>
        <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6, delay: 0.2 }} style={{ fontSize: 56 }}>🎉</motion.div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.03em', marginBottom: 8 }}>Você está livre das dívidas!</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Você pagou <strong style={{ color: 'var(--color-text-strong)' }}>{fmt(totalPaid)}</strong> em dívidas. Agora é hora de construir riqueza.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/app/goals')}
            style={{ height: 48, background: 'var(--color-green-600)', border: 'none', borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            🎯 Criar meta de investimento
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAddingDebt(true)}
            style={{ height: 40, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 12, color: 'var(--color-text-subtle)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cadastrar nova dívida
          </motion.button>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fef9c3, #fefce8)', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 320 }}>
          <div style={{ fontSize: 28 }}>🏆</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 2 }}>Conquista desbloqueada!</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#78350f' }}>Livre das Dívidas</div>
          </div>
        </div>
        <AddDebtSheet open={addingDebt} onClose={() => { setAddingDebt(false); resetForm(); setEditingDebt(null); }}
          formType={formType} setFormType={setFormType} formName={formName} setFormName={(v) => { setFormName(v); const r = suggestRate(v); if (r && !formInterest) setFormInterest(r); }}
          formCreditor={formCreditor} setFormCreditor={setFormCreditor} formTotal={formTotal} setFormTotal={setFormTotal}
          formRemaining={formRemaining} setFormRemaining={setFormRemaining} formInterest={formInterest} setFormInterest={setFormInterest}
          formMinPayment={formMinPayment} setFormMinPayment={setFormMinPayment} formShowMore={formShowMore} setFormShowMore={setFormShowMore}
          submitting={submitting} onSubmit={handleSaveDebt} isEditing={!!editingDebt}
        />
      </div>
    );
  }

  /* ─── STATE B: Active debts — Coach Experience ─── */
  const priorityDebt = orderedDebts[0] || null;
  const hasHighInterest = activeDebts.some(d => Number(d.interest_rate) > 10);
  const severity: 'critical' | 'high' | 'medium' = totalRemaining > 50000 ? 'critical' : hasHighInterest ? 'high' : 'medium';
  const heroColors = {
    critical: { bg: '#1a0505', border: 'rgba(239,68,68,0.25)', accent: '#f87171' },
    high:     { bg: '#1a0a05', border: 'rgba(245,158,11,0.25)', accent: '#fbbf24' },
    medium:   { bg: '#0a1205', border: 'rgba(124, 58, 237,0.25)',  accent: '#4ade80' },
  };
  const hc = heroColors[severity];

  // Next action logic
  const getNextAction = () => {
    if (missingDataDebts.length > 0) {
      const d = missingDataDebts[0];
      return {
        icon: '⚠️', severity: 'warning' as const,
        title: `Complete os dados de "${d.name}"`,
        message: `Falta a taxa de juros e/ou pagamento mínimo. Sem isso não consigo calcular a melhor estratégia para você.`,
        cta: 'Completar dados →',
        action: () => openEditDebt(d),
      };
    }
    const creditCard = activeDebts.find(d => Number(d.interest_rate) > 10 && /cart[aã]o|credito|crédito/i.test(d.name));
    if (creditCard) {
      const rate = Number(creditCard.interest_rate);
      const annualRate = ((Math.pow(1 + rate / 100, 12) - 1) * 100).toFixed(0);
      const monthlyLoss = (Number(creditCard.remaining_amount) * rate / 100).toFixed(0);
      return {
        icon: '🚨', severity: 'critical' as const,
        title: 'Prioridade: Rotativo do cartão',
        message: `"${creditCard.name}" tem ${rate}% ao mês — isso é ${annualRate}% ao ano! Cada mês, você perde R$ ${monthlyLoss} em juros.`,
        cta: 'Registrar pagamento agora',
        action: () => { setPaymentModal(creditCard); setPayAmount(''); setPayDate(new Date().toISOString().split('T')[0]); setPayNotes(''); },
        tip: null,
      };
    }
    if (priorityDebt) {
      const months = calculateMonthsToFree(Number(priorityDebt.remaining_amount), Number(priorityDebt.interest_rate) / 100, Number(priorityDebt.min_payment));
      return {
        icon: '💪', severity: 'active' as const,
        title: `Foque em: ${priorityDebt.name}`,
        message: months
          ? `Pagando R$ ${fmtCompact(Number(priorityDebt.min_payment))}/mês, você quita em ${months} meses. Qualquer valor extra acelera muito.`
          : `Comece pagando o que puder. Cada pagamento reduz o saldo e os juros.`,
        cta: 'Registrar pagamento',
        action: () => { setPaymentModal(priorityDebt); setPayAmount(''); setPayDate(new Date().toISOString().split('T')[0]); setPayNotes(''); },
        tip: months && Number(priorityDebt.min_payment) > 0
          ? `Dica: R$ ${fmtCompact(Number(priorityDebt.min_payment) * 1.5)}/mês = ~${Math.ceil(months * 0.65)} meses`
          : null,
      };
    }
    return null;
  };
  const nextAction = getNextAction();

  const actionBg: Record<string, string> = { critical: '#1a0505', warning: '#1a1005', active: '#051205' };
  const actionBorder: Record<string, string> = { critical: 'rgba(239,68,68,0.25)', warning: 'rgba(245,158,11,0.25)', active: 'rgba(124, 58, 237,0.25)' };
  const actionColor: Record<string, string> = { critical: '#f87171', warning: '#fbbf24', active: '#4ade80' };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.03em' }}>Minhas Dívidas</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{activeDebts.length} dívida{activeDebts.length !== 1 ? 's' : ''} ativa{activeDebts.length !== 1 ? 's' : ''}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { resetForm(); setEditingDebt(null); setAddingDebt(true); }}
          style={{ height: 36, padding: '0 14px', background: 'var(--color-green-600)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Nova dívida
        </motion.button>
      </div>

      {/* ── 1. Hero Status Card ── */}
      <div style={{
        margin: '12px 16px 0', background: 'linear-gradient(135deg, #160B28, #0F0520)', border: '1.5px solid rgba(124, 58, 237,0.25)',
        borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: hc.accent, opacity: 0.08, filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Total em dívidas</div>
        <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: 'white', lineHeight: 1, marginBottom: 16 }}>
          {fmt(totalRemaining)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 }}>
          {[
            { label: 'Dívidas', value: String(activeDebts.length), color: 'white' },
            { label: 'Juros/mês', value: monthlyInterest > 0 ? `R$ ${fmtCompact(monthlyInterest)}` : '—', color: monthlyInterest > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' },
            { label: 'Custo/ano', value: monthlyInterest > 0 ? `R$ ${fmtCompact(monthlyInterest * 12)}` : '—', color: monthlyInterest > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '0 10px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            </div>
          ))}
        </div>
        {missingDataDebts.length > 0 && (
          <div onClick={() => openEditDebt(missingDataDebts[0])} style={{
            marginTop: 12, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: '#fbbf24', cursor: 'pointer',
          }}>
            <AlertTriangle size={13} />
            Preencha taxa de juros para cálculos precisos
          </div>
        )}
      </div>

      {/* ── 2. Next Action (Coach) ── */}
      {nextAction && (
        <div style={{ margin: '16px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>⚡ Próxima ação</div>
          <div style={{ background: actionBg[nextAction.severity], border: `1.5px solid ${actionBorder[nextAction.severity]}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{nextAction.icon}</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: actionColor[nextAction.severity], letterSpacing: '-0.01em', lineHeight: 1.3 }}>{nextAction.title}</div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 14 }}>{nextAction.message}</p>
            {nextAction.tip && (
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                💡 {nextAction.tip}
              </div>
            )}
            <motion.button whileTap={{ scale: 0.97 }} onClick={nextAction.action}
              style={{ width: '100%', height: 44, background: '#22c55e', border: 'none', borderRadius: 11, color: '#000000', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 3px 12px rgba(139, 92, 246,0.4)' }}>
              {nextAction.cta}
            </motion.button>
          </div>
        </div>
      )}

      {/* ── 3. Strategy Pills ── */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Estratégia</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { id: 'avalanche' as const, emoji: '🏔️', label: 'Avalanche', sub: 'Economiza mais' },
            { id: 'snowball' as const, emoji: '⛄', label: 'Bola de Neve', sub: 'Motiva mais' },
          ]).map(s => (
            <motion.button key={s.id} whileTap={{ scale: 0.96 }} onClick={() => handleStrategyChange(s.id)}
              style={{
                flex: 1, padding: '11px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', minHeight: 52,
                background: strategy === s.id ? 'var(--success-bg)' : 'var(--color-bg-surface)',
                outline: `1.5px solid ${strategy === s.id ? 'var(--color-green-500)' : 'var(--color-border-base)'}`,
                borderRadius: 12,
              }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: strategy === s.id ? 'var(--success-text)' : 'var(--color-text-strong)' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{s.sub}</div>
              </div>
              {strategy === s.id && <Check size={14} color="var(--success-text)" />}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── 4. Debt List ── */}
      <div style={{ margin: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {orderedDebts.length} dívida{orderedDebts.length !== 1 ? 's' : ''} — ordem {strategy === 'snowball' ? 'Bola de Neve' : 'Avalanche'}
        </div>
        {orderedDebts.map((debt, index) => (
          <DebtCard
            key={debt.id} debt={debt} isPriority={index === 0} rank={index + 1}
            onPay={() => { setPaymentModal(debt); setPayAmount(''); setPayDate(new Date().toISOString().split('T')[0]); setPayNotes(''); }}
            onEdit={() => openEditDebt(debt)}
            onDelete={() => handleDeleteDebt(debt.id)}
            onStatusChange={(s) => handleStatusChange(debt.id, s)}
            onSimulate={() => navigate('/app/simulator')}
          />
        ))}
      </div>

      {/* ── 5. Paid debts ── */}
      {paidDebts.length > 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <PaidDebtsSection debts={paidDebts} />
        </div>
      )}

      {/* ── 6. Projection ── */}
      <div style={{ margin: '16px 16px 0' }}>
        {missingDataDebts.length > 0 || !payoffInfo ? (
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 16, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 6 }}>Projeção de liberdade</div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Preencha a taxa de juros e pagamento mínimo de todas as dívidas para ver quando você estará livre.
            </p>
            {missingDataDebts.length > 0 && (
              <button onClick={() => openEditDebt(missingDataDebts[0])}
                style={{ padding: '8px 18px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 99, color: 'var(--success-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Completar dados →
              </button>
            )}
          </div>
        ) : payoffInfo.warning ? (
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>Atenção</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
              O pagamento mínimo de alguma dívida não cobre os juros mensais. Aumente o valor pago ou renegocie com o credor.
            </p>
            <button onClick={() => navigate('/app/simulator')}
              style={{ padding: '8px 18px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 99, color: 'var(--success-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Simular cenários →
            </button>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #1A0D35, #0F0520)', borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(124, 58, 237,0.15)', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>🎯 Projeção de liberdade</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Livre em</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.03em' }}>
                  {payoffInfo.months! < 12 ? `${payoffInfo.months} meses` : `${(payoffInfo.months! / 12).toFixed(1)} anos`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {payoffInfo.freedomDate!.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Total em juros</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: payoffInfo.totalInterest > 1000 ? '#f87171' : 'rgba(255,255,255,0.7)', letterSpacing: '-0.03em' }}>
                  R$ {fmtCompact(payoffInfo.totalInterest)}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>pagando mínimo</div>
              </div>
            </div>
            <div onClick={() => navigate('/app/simulator')} style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '11px 14px',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}>
              <Sparkles size={13} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, flex: 1 }}>
                Quer sair mais rápido? Simule quanto a mais você precisa pagar →
              </span>
              <ChevronRight size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />

      {/* ── Sheets ── */}
      <AddDebtSheet open={addingDebt} onClose={() => { setAddingDebt(false); resetForm(); setEditingDebt(null); }}
        formType={formType} setFormType={setFormType} formName={formName} setFormName={(v) => { setFormName(v); const r = suggestRate(v); if (r && !formInterest) setFormInterest(r); }}
        formCreditor={formCreditor} setFormCreditor={setFormCreditor} formTotal={formTotal} setFormTotal={setFormTotal}
        formRemaining={formRemaining} setFormRemaining={setFormRemaining} formInterest={formInterest} setFormInterest={setFormInterest}
        formMinPayment={formMinPayment} setFormMinPayment={setFormMinPayment} formShowMore={formShowMore} setFormShowMore={setFormShowMore}
        submitting={submitting} onSubmit={handleSaveDebt} isEditing={!!editingDebt}
      />

      {/* Payment Modal */}
      <BottomSheet open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Registrar Pagamento">
        {paymentModal && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 12 }}>{paymentModal.name}</p>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger-text)' }}>Saldo: {fmt(Number(paymentModal.remaining_amount))}</p>
              {Number(paymentModal.interest_rate) > 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Juros este mês: ~{fmt(Number(paymentModal.remaining_amount) * Number(paymentModal.interest_rate) / 100)}</p>
              )}
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor pago</label>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--color-border-base)', paddingBottom: 8, marginBottom: 8, marginTop: 4 }}>
              <span style={{ fontSize: 16, color: 'var(--color-text-muted)', marginRight: 8 }}>R$</span>
              <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder="0,00" autoFocus
                style={{ flex: 1, fontSize: 24, fontWeight: 900, color: 'var(--color-text-strong)', outline: 'none', background: 'transparent', border: 'none', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                ...(Number(paymentModal.min_payment) > 0 ? [{ label: `Mínimo ${fmt(Number(paymentModal.min_payment))}`, val: Number(paymentModal.min_payment) }] : []),
                { label: '+R$ 100', val: Number(paymentModal.min_payment || 0) + 100 },
                { label: 'Quitar tudo', val: Number(paymentModal.remaining_amount) },
              ].map((p, i) => (
                <button key={i} onClick={() => setPayAmount(String(p.val))}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data</label>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                  style={{ width: '100%', height: 38, border: '1.5px solid var(--color-border-base)', borderRadius: 9, padding: '0 10px', fontSize: 13, fontWeight: 600, outline: 'none', background: 'var(--color-bg-base)', color: 'var(--color-text-strong)', marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nota</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Opcional"
                  style={{ width: '100%', height: 38, border: '1.5px solid var(--color-border-base)', borderRadius: 9, padding: '0 10px', fontSize: 13, outline: 'none', background: 'var(--color-bg-base)', color: 'var(--color-text-strong)', marginTop: 4 }} />
              </div>
            </div>
            {payAmount && Number(payAmount) >= Number(paymentModal.remaining_amount) && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--success-text)' }}>
                🎉 Esta dívida será QUITADA!
              </div>
            )}
            <motion.button whileTap={{ scale: 0.97 }} onClick={handlePayment} disabled={paySubmitting || !payAmount}
              style={{ width: '100%', height: 48, background: 'var(--color-green-600)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: paySubmitting || !payAmount ? 0.5 : 1 }}>
              {paySubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
            </motion.button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

/* ─── DebtCard ─── */
function DebtCard({ debt, isPriority, rank, onPay, onEdit, onDelete, onStatusChange, onSimulate }: {
  debt: Debt; isPriority: boolean; rank: number;
  onPay: () => void; onEdit: () => void; onDelete: () => void;
  onStatusChange: (s: string) => void; onSimulate: () => void;
}) {
  const [expanded, setExpanded] = useState(isPriority);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalAmt = Number(debt.total_amount);
  const remAmt = Number(debt.remaining_amount);
  const rate = Number(debt.interest_rate || 0);
  const minPay = Number(debt.min_payment || 0);
  const pct = totalAmt > 0 ? Math.max(0, Math.min(100, ((totalAmt - remAmt) / totalAmt) * 100)) : 0;
  const monthlyInt = remAmt * rate / 100;
  const barColor = pct > 50 ? 'var(--color-green-500)' : '#f59e0b';

  const monthsLeft = rate > 0 && minPay > 0
    ? calculateMonthsToFree(remAmt, rate / 100, minPay) : null;

  const monthsLabel = monthsLeft
    ? (monthsLeft < 12 ? `${monthsLeft}m` : `${(monthsLeft / 12).toFixed(1)}a`)
    : '—';

  const freedomLabel = monthsLeft
    ? (() => { const d = new Date(); d.setMonth(d.getMonth() + monthsLeft); return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }); })()
    : 'complete os dados';

  return (
    <motion.div layout style={{
      background: 'var(--color-bg-surface)',
      border: `1.5px solid ${isPriority ? 'var(--color-green-500)' : 'var(--color-border-weak)'}`,
      borderRadius: 16, overflow: 'hidden', boxShadow: isPriority ? 'var(--shadow-sm)' : 'none',
    }}>
      {isPriority && (
        <div style={{ background: 'var(--color-green-600)', padding: '5px 14px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={10} /> Foco agora — pague o máximo
        </div>
      )}

      {/* Header row */}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: isPriority ? 'var(--color-green-600)' : 'var(--color-bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: isPriority ? 'white' : 'var(--color-text-muted)', flexShrink: 0 }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{debt.name}</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
            {rate > 0 ? (
              <span style={{ color: rate > 10 ? '#dc2626' : 'var(--color-text-muted)' }}>{rate}%/mês</span>
            ) : (
              <span style={{ color: '#f59e0b' }}>⚠️ sem taxa</span>
            )}
            {monthsLeft && <><span>·</span><span>{monthsLeft} meses</span></>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: 'var(--color-text-strong)' }}>{fmt(remAmt)}</div>
          {monthlyInt > 0 && <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginTop: 1 }}>+R$ {fmtCompact(monthlyInt)}/mês</div>}
        </div>
        <ChevronDown size={15} color="var(--color-text-muted)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }} />
      </div>

      {/* Progress bar */}
      {totalAmt > 0 && (
        <div style={{ height: 3, background: 'var(--color-bg-sunken)', marginInline: 16 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
            style={{ height: '100%', background: barColor, borderRadius: 99, minWidth: pct > 0 ? 2 : 0 }} />
        </div>
      )}

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--color-border-ghost)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { label: 'Pago', value: `${pct.toFixed(0)}%`, sub: totalAmt > 0 ? `R$ ${fmtCompact(totalAmt - remAmt)}` : '—', action: null, dashed: false, warning: false },
                  {
                    label: 'Parcela mín.', value: minPay > 0 ? `R$ ${fmtCompact(minPay)}` : '—',
                    sub: minPay > 0 ? '/mês' : 'Definir →', action: minPay <= 0 ? onEdit : null, dashed: minPay <= 0, warning: false,
                  },
                  {
                    label: 'Livre em', value: monthsLabel,
                    sub: freedomLabel, action: null, dashed: false,
                    warning: monthsLeft !== null && monthsLeft > 120,
                  },
                ].map((s, i) => (
                  <div key={i} onClick={s.action || undefined}
                    style={{
                      background: 'var(--color-bg-sunken)', borderRadius: 10, padding: 10, textAlign: 'center',
                      cursor: s.action ? 'pointer' : 'default',
                      border: s.dashed ? '1px dashed #f59e0b' : 'none',
                    }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.warning ? '#f59e0b' : 'var(--color-text-strong)' }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: s.dashed ? '#f59e0b' : 'var(--color-text-muted)', marginTop: 2, fontWeight: s.dashed ? 700 : 400 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); onPay(); }}
                  style={{ flex: 1, height: 42, background: 'var(--color-green-600)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <DollarSign size={14} /> Registrar pagamento
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  style={{ width: 42, height: 42, background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-base)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={14} color="var(--color-text-muted)" />
                </motion.button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => e.stopPropagation()} aria-label="Mais ações"
                      style={{ width: 42, height: 42, background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-base)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MoreVertical size={14} color="var(--color-text-muted)" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} onClick={(e) => e.stopPropagation()} className="w-48 border-border bg-popover text-popover-foreground shadow-lg">
                    {debt.status === 'active' ? (
                      <DropdownMenuItem onClick={() => onStatusChange('paused')} className="gap-2 text-foreground">
                        <Pause size={13} />
                        Pausar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onStatusChange('active')} className="gap-2 text-foreground">
                        <Play size={13} />
                        Reativar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onStatusChange('paid')} className="gap-2 text-foreground">
                      <Check size={13} />
                      Marcar quitada
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 size={13} />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Simulator shortcut */}
              <div onClick={onSimulate} style={{
                padding: '10px 12px', background: 'rgba(124, 58, 237,0.06)', border: '1px solid rgba(124, 58, 237,0.15)',
                borderRadius: 10, fontSize: 12, color: 'var(--success-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Sparkles size={12} />
                <span style={{ flex: 1 }}>Simular: "E se eu pagar R$ 200 a mais/mês?"</span>
                <ChevronRight size={12} style={{ flexShrink: 0 }} />
              </div>

              {confirmDelete && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger-text)', flex: 1 }}>Excluir esta dívida?</span>
                  <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ fontSize: 11, fontWeight: 700, color: 'white', background: '#dc2626', padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Sim</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-bg-sunken)', padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Não</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


/* ─── PaidDebtsSection ─── */
function PaidDebtsSection({ debts }: { debts: Debt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--color-bg-surface)', borderRadius: 14, border: '1px solid var(--color-border-weak)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 16 }}>🏆</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-strong)', flex: 1, textAlign: 'left' }}>Dívidas Quitadas ({debts.length})</span>
        <ChevronDown size={14} color="var(--color-text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            {debts.map(d => (
              <div key={d.id} style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border-ghost)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-subtle)', flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-text)' }}>{fmt(Number(d.total_amount))}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── AddDebtSheet ─── */
function AddDebtSheet({ open, onClose, formType, setFormType, formName, setFormName, formCreditor, setFormCreditor, formTotal, setFormTotal, formRemaining, setFormRemaining, formInterest, setFormInterest, formMinPayment, setFormMinPayment, formShowMore, setFormShowMore, submitting, onSubmit, isEditing }: {
  open: boolean; onClose: () => void; isEditing: boolean;
  formType: string; setFormType: (v: string) => void;
  formName: string; setFormName: (v: string) => void;
  formCreditor: string; setFormCreditor: (v: string) => void;
  formTotal: string; setFormTotal: (v: string) => void;
  formRemaining: string; setFormRemaining: (v: string) => void;
  formInterest: string; setFormInterest: (v: string) => void;
  formMinPayment: string; setFormMinPayment: (v: string) => void;
  formShowMore: boolean; setFormShowMore: (v: boolean) => void;
  submitting: boolean; onSubmit: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 42, border: '1.5px solid var(--color-border-base)',
    borderRadius: 9, padding: '0 12px', fontSize: 14, fontWeight: 600,
    outline: 'none', background: 'var(--color-bg-base)', color: 'var(--color-text-strong)',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block',
  };

  const RATE_SHORTCUTS = [
    { label: 'Rotativo', rate: '15' },
    { label: 'Cheque esp.', rate: '12' },
    { label: 'Pessoal', rate: '8' },
    { label: 'Consignado', rate: '2' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={isEditing ? 'Editar Dívida' : 'Nova Dívida'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Type pills */}
        <div>
          <span style={labelStyle}>Tipo</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DEBT_TYPES.slice(0, 6).map(t => (
              <button key={t.val} onClick={() => { setFormType(t.val); if (t.suggestedRate && !formInterest) setFormInterest(t.suggestedRate); }}
                style={{
                  padding: '6px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: formType === t.val ? 'var(--success-bg)' : 'var(--color-bg-sunken)',
                  color: formType === t.val ? 'var(--success-text)' : 'var(--color-text-subtle)',
                  outline: formType === t.val ? '1.5px solid var(--color-green-500)' : 'none',
                }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={labelStyle}>Nome da dívida</span>
          <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Cartão Nubank" style={inputStyle} />
        </div>

        <div>
          <span style={labelStyle}>Valor total devido</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 }}>R$</span>
            <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formTotal} onChange={e => setFormTotal(e.target.value)} placeholder="0,00" style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
        </div>

        <div>
          <span style={labelStyle}>Taxa de juros (% ao mês)</span>
          <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formInterest} onChange={e => setFormInterest(e.target.value)} placeholder="0,00" style={inputStyle} />
          {formInterest && Number(formInterest) > 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>
              ≈ {((Math.pow(1 + Number(formInterest) / 100, 12) - 1) * 100).toFixed(0)}% ao ano
            </span>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {RATE_SHORTCUTS.map(r => (
              <button key={r.label} onClick={() => setFormInterest(r.rate)}
                style={{
                  padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 99, cursor: 'pointer',
                  background: formInterest === r.rate ? 'var(--success-bg)' : 'var(--color-bg-sunken)',
                  border: `1px solid ${formInterest === r.rate ? 'var(--success-border)' : 'var(--color-border-base)'}`,
                  color: formInterest === r.rate ? 'var(--success-text)' : 'var(--color-text-muted)',
                }}>
                {r.label} {r.rate}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={labelStyle}>Pagamento mínimo (R$/mês)</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 }}>R$</span>
            <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formMinPayment} onChange={e => setFormMinPayment(e.target.value)} placeholder="0,00" style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
        </div>

        <button onClick={() => setFormShowMore(!formShowMore)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-600)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          {formShowMore ? '▾ Menos opções' : '▸ Mais opções'}
        </button>

        {formShowMore && (
          <>
            <div>
              <span style={labelStyle}>Valor restante (se diferente do total)</span>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 }}>R$</span>
                <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formRemaining} onChange={e => setFormRemaining(e.target.value)} placeholder="Mesmo que o total" style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
            </div>
            <div>
              <span style={labelStyle}>Credor / Banco</span>
              <input value={formCreditor} onChange={e => setFormCreditor(e.target.value)} placeholder="Ex: Nubank" style={inputStyle} />
            </div>
          </>
        )}

        <motion.button whileTap={{ scale: 0.97 }} onClick={onSubmit} disabled={submitting || !formName || !formTotal}
          style={{ width: '100%', height: 48, background: 'var(--color-green-600)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: submitting || !formName || !formTotal ? 0.5 : 1, marginTop: 4 }}>
          {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Dívida'}
        </motion.button>
      </div>
    </BottomSheet>
  );
}

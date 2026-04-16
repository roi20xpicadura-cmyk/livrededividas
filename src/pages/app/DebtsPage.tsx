import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from '@/components/app/BottomSheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Plus, ChevronDown, Zap, Pencil, Check, Trash2, X,
  MoreVertical, Pause, Play, Shield
} from 'lucide-react';

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
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.0', '')}k`;
  return v.toFixed(0);
};

export default function DebtsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [addingDebt, setAddingDebt] = useState(false);
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

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [dRes, pRes] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', user.id).is('deleted_at', null).order('priority', { ascending: true }),
      supabase.from('debt_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
    ]);
    setDebts((dRes.data as Debt[]) || []);
    setPayments((pRes.data as DebtPayment[]) || []);

    // Load saved strategy
    const { data: config } = await supabase.from('user_config').select('debt_strategy').eq('user_id', user.id).single();
    if (config?.debt_strategy === 'avalanche') setStrategy('avalanche');

    setLoading(false);
  };

  const activeDebts = debts.filter(d => d.status === 'active');
  const paidDebts = debts.filter(d => d.status === 'paid');
  const totalRemaining = activeDebts.reduce((s, d) => s + Number(d.remaining_amount), 0);
  const monthlyInterest = activeDebts.reduce((s, d) => s + Number(d.remaining_amount) * Number(d.interest_rate) / 100, 0);
  const highestRate = activeDebts.length ? Math.max(...activeDebts.map(d => Number(d.interest_rate))) : 0;
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const orderedDebts = useMemo(() => {
    const a = [...activeDebts];
    if (strategy === 'snowball') a.sort((x, y) => Number(x.remaining_amount) - Number(y.remaining_amount));
    else a.sort((x, y) => Number(y.interest_rate) - Number(x.interest_rate));
    return a;
  }, [activeDebts, strategy]);

  // Payoff estimate
  const payoffInfo = useMemo(() => {
    if (!activeDebts.length) return { months: 0, date: '', interestSaved: 0 };
    let rem = activeDebts.map(d => ({ rem: Number(d.remaining_amount), rate: Number(d.interest_rate), min: Number(d.min_payment) }));
    let totalInterestMin = 0;
    for (let m = 1; m <= 360; m++) {
      let allPaid = true;
      rem = rem.map(d => {
        if (d.rem <= 0) return d;
        const interest = d.rem * d.rate / 100;
        totalInterestMin += interest;
        const newRem = Math.max(0, d.rem + interest - d.min);
        if (newRem > 0) allPaid = false;
        return { ...d, rem: newRem };
      });
      if (allPaid) {
        const date = new Date();
        date.setMonth(date.getMonth() + m);
        return {
          months: m,
          date: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          interestSaved: totalInterestMin * 0.3,
        };
      }
    }
    return { months: 360, date: '30+ anos', interestSaved: 0 };
  }, [activeDebts]);

  const handleStrategyChange = async (s: 'snowball' | 'avalanche') => {
    setStrategy(s);
    if (user) {
      await supabase.from('user_config').update({ debt_strategy: s }).eq('user_id', user.id);
    }
  };

  // Smart rate suggestion based on name
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

  const handleAddDebt = async () => {
    if (!user || !formName || !formTotal) return;
    setSubmitting(true);
    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      name: formName,
      creditor: formCreditor || formName,
      total_amount: parseFloat(formTotal),
      remaining_amount: parseFloat(formRemaining || formTotal),
      interest_rate: parseFloat(formInterest || '0'),
      min_payment: parseFloat(formMinPayment || '0'),
      debt_type: formType,
      color: '#dc2626',
      strategy,
      priority: debts.length,
    });
    setSubmitting(false);
    if (error) { toast.error('Erro ao cadastrar dívida'); return; }
    toast.success('Dívida cadastrada!');
    resetForm();
    setAddingDebt(false);
    fetchData();
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
      confetti({ particleCount: 200, spread: 90, colors: ['#16a34a', '#22c55e', '#d97706', '#ffffff'] });
      toast.success(`🏆 ${paymentModal.name} quitada!`, { duration: 4000 });
    } else {
      toast.success(`✓ Pagamento de ${fmt(amount)} registrado!`);
    }
    setPaymentModal(null); setPayAmount(''); setPayNotes('');
    fetchData();
  };

  const handleDeleteDebt = async (id: string) => {
    await supabase.from('debt_payments').delete().eq('debt_id', id);
    await supabase.from('debts').delete().eq('id', id);
    toast.success('Dívida excluída');
    fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (status === 'paid') {
      confetti({ particleCount: 200, spread: 90, colors: ['#16a34a', '#22c55e', '#d97706', '#ffffff'] });
    }
    await supabase.from('debts').update({ status }).eq('id', id);
    toast.success(status === 'paid' ? '🏆 Dívida quitada!' : status === 'paused' ? 'Dívida pausada' : 'Dívida reativada');
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-5" style={{ maxWidth: 640, margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: i === 1 ? 120 : 80, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  // ─── STATE A: No debts ───
  if (debts.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20, minHeight: '70vh' }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, var(--success-bg), rgba(34,197,94,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
          🛡️
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.03em', marginBottom: 8 }}>
            Sem dívidas cadastradas
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            Cadastre suas dívidas e a IA vai criar um plano personalizado para você se livrar delas.
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAddingDebt(true)}
          style={{ height: 48, padding: '0 28px', background: 'var(--color-green-600)', border: 'none', borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-green)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Cadastrar primeira dívida
        </motion.button>
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', borderRadius: 14, padding: '14px 16px', maxWidth: 320, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            💡 Por que cadastrar?
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', lineHeight: 1.6 }}>
            Com todas as dívidas cadastradas, a IA calcula a estratégia mais rápida e econômica para você quitar tudo.
          </p>
        </div>
        <AddDebtSheet open={addingDebt} onClose={() => { setAddingDebt(false); resetForm(); }}
          formType={formType} setFormType={setFormType} formName={formName} setFormName={(v) => { setFormName(v); const r = suggestRate(v); if (r && !formInterest) setFormInterest(r); }}
          formCreditor={formCreditor} setFormCreditor={setFormCreditor}
          formTotal={formTotal} setFormTotal={setFormTotal} formRemaining={formRemaining} setFormRemaining={setFormRemaining}
          formInterest={formInterest} setFormInterest={setFormInterest} formMinPayment={formMinPayment} setFormMinPayment={setFormMinPayment}
          formShowMore={formShowMore} setFormShowMore={setFormShowMore} submitting={submitting} onSubmit={handleAddDebt}
        />
      </div>
    );
  }

  // ─── STATE C: All debts paid ───
  if (activeDebts.length === 0 && paidDebts.length > 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20, minHeight: '70vh' }}>
        <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6, delay: 0.2 }} style={{ fontSize: 56 }}>
          🎉
        </motion.div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.03em', marginBottom: 8 }}>
            Você está livre das dívidas!
          </h2>
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
        <AddDebtSheet open={addingDebt} onClose={() => { setAddingDebt(false); resetForm(); }}
          formType={formType} setFormType={setFormType} formName={formName} setFormName={(v) => { setFormName(v); const r = suggestRate(v); if (r && !formInterest) setFormInterest(r); }}
          formCreditor={formCreditor} setFormCreditor={setFormCreditor}
          formTotal={formTotal} setFormTotal={setFormTotal} formRemaining={formRemaining} setFormRemaining={setFormRemaining}
          formInterest={formInterest} setFormInterest={setFormInterest} formMinPayment={formMinPayment} setFormMinPayment={setFormMinPayment}
          formShowMore={formShowMore} setFormShowMore={setFormShowMore} submitting={submitting} onSubmit={handleAddDebt}
        />
      </div>
    );
  }

  // ─── STATE B: Active debts ───
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.03em' }}>
            Minhas Dívidas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {activeDebts.length} dívida{activeDebts.length !== 1 ? 's' : ''} ativa{activeDebts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAddingDebt(true)}
          style={{ height: 36, padding: '0 14px', background: 'var(--color-green-600)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Nova dívida
        </motion.button>
      </div>

      {/* Summary Card */}
      <div style={{ margin: '16px 16px 0', background: 'var(--color-bg-surface)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border-weak)' }}>
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-border-ghost)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Total em dívidas
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', color: 'var(--color-text-strong)', lineHeight: 1 }}>
            {fmt(totalRemaining)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { label: 'Dívidas', value: String(activeDebts.length), color: 'var(--color-text-strong)' },
            { label: 'Juros/mês', value: fmt(monthlyInterest), color: '#dc2626' },
            { label: 'Maior taxa', value: `${highestRate}%`, color: '#dc2626' },
          ].map((stat, i) => (
            <div key={i} style={{ padding: '0 12px', borderLeft: i > 0 ? '1px solid var(--color-border-ghost)' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: stat.color, letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Selector */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Estratégia de quitação
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            { id: 'snowball' as const, emoji: '⛄', name: 'Bola de Neve', desc: 'Menor dívida primeiro', benefit: 'Motivação rápida' },
            { id: 'avalanche' as const, emoji: '🏔️', name: 'Avalanche', desc: 'Maior juros primeiro', benefit: 'Economiza mais' },
          ]).map(s => (
            <motion.button key={s.id} whileTap={{ scale: 0.97 }} onClick={() => handleStrategyChange(s.id)}
              style={{
                padding: 14, textAlign: 'left', cursor: 'pointer', border: 'none',
                background: strategy === s.id ? 'var(--success-bg)' : 'var(--color-bg-surface)',
                outline: `1.5px solid ${strategy === s.id ? 'var(--color-green-500)' : 'var(--color-border-base)'}`,
                borderRadius: 14, transition: 'all 150ms',
              }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: strategy === s.id ? 'var(--success-text)' : 'var(--color-text-strong)', marginBottom: 2 }}>
                {s.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.desc}</div>
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, display: 'inline-block',
                background: strategy === s.id ? 'rgba(22,163,74,0.15)' : 'var(--color-bg-sunken)',
                color: strategy === s.id ? 'var(--success-text)' : 'var(--color-text-muted)',
              }}>
                {s.benefit}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Debt List */}
      <div style={{ margin: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {orderedDebts.length} dívida{orderedDebts.length !== 1 ? 's' : ''} — ordem {strategy === 'snowball' ? 'Bola de Neve' : 'Avalanche'}
        </div>
        {orderedDebts.map((debt, index) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            isPriority={index === 0}
            rank={index + 1}
            onPay={() => { setPaymentModal(debt); setPayAmount(''); setPayDate(new Date().toISOString().split('T')[0]); setPayNotes(''); }}
            onDelete={() => handleDeleteDebt(debt.id)}
            onStatusChange={(s) => handleStatusChange(debt.id, s)}
          />
        ))}

        {/* Paid debts section */}
        {paidDebts.length > 0 && (
          <PaidDebtsSection debts={paidDebts} />
        )}
      </div>

      {/* Payoff Projection */}
      {activeDebts.length > 0 && (
        <div style={{
          margin: '16px 16px 0', background: 'linear-gradient(135deg, #0D2818, #0a1f12)',
          borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(22,163,74,0.15)', filter: 'blur(30px)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            🎯 Projeção de liberdade
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 500 }}>Livre das dívidas em</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.03em' }}>
                {payoffInfo.date}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {payoffInfo.months} meses restantes
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 500 }}>Total em juros</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F87171', letterSpacing: '-0.03em' }}>
                {fmt(monthlyInterest * payoffInfo.months)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>pagando mínimo</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            💡 Pagando R$ 200 extra/mês na dívida foco, você quita até {Math.ceil(payoffInfo.months * 0.3)} meses antes.
          </div>
        </div>
      )}

      {/* Add Debt Sheet */}
      <AddDebtSheet open={addingDebt} onClose={() => { setAddingDebt(false); resetForm(); }}
        formType={formType} setFormType={setFormType} formName={formName} setFormName={(v) => { setFormName(v); const r = suggestRate(v); if (r && !formInterest) setFormInterest(r); }}
        formCreditor={formCreditor} setFormCreditor={setFormCreditor}
        formTotal={formTotal} setFormTotal={setFormTotal} formRemaining={formRemaining} setFormRemaining={setFormRemaining}
        formInterest={formInterest} setFormInterest={setFormInterest} formMinPayment={formMinPayment} setFormMinPayment={setFormMinPayment}
        formShowMore={formShowMore} setFormShowMore={setFormShowMore} submitting={submitting} onSubmit={handleAddDebt}
      />

      {/* Payment Modal */}
      <BottomSheet open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Registrar Pagamento">
        {paymentModal && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 12 }}>{paymentModal.name}</p>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger-text)' }}>Saldo: {fmt(Number(paymentModal.remaining_amount))}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Juros este mês: ~{fmt(Number(paymentModal.remaining_amount) * Number(paymentModal.interest_rate) / 100)}</p>
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
                { label: `Mínimo ${fmt(Number(paymentModal.min_payment))}`, val: Number(paymentModal.min_payment) },
                { label: '+R$ 100', val: Number(paymentModal.min_payment) + 100 },
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
function DebtCard({ debt, isPriority, rank, onPay, onDelete, onStatusChange }: {
  debt: Debt; isPriority: boolean; rank: number;
  onPay: () => void; onDelete: () => void; onStatusChange: (s: string) => void;
}) {
  const [expanded, setExpanded] = useState(isPriority);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = Number(debt.total_amount) > 0 ? Math.max(0, Math.min(100, ((Number(debt.total_amount) - Number(debt.remaining_amount)) / Number(debt.total_amount)) * 100)) : 0;
  const monthlyInterest = Number(debt.remaining_amount) * Number(debt.interest_rate) / 100;
  const barColor = pct > 50 ? 'var(--color-green-500)' : '#f59e0b';

  return (
    <motion.div layout style={{
      background: 'var(--color-bg-surface)', border: `1.5px solid ${isPriority ? 'var(--color-green-500)' : 'var(--color-border-weak)'}`,
      borderRadius: 16, overflow: 'hidden', boxShadow: isPriority ? 'var(--shadow-sm)' : 'none',
    }}>
      {isPriority && (
        <div style={{ background: 'var(--color-green-600)', padding: '5px 16px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={10} /> FOCO AQUI — Pague o máximo que puder
        </div>
      )}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: isPriority ? 'var(--color-green-600)' : 'var(--color-bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: isPriority ? 'white' : 'var(--color-text-muted)', flexShrink: 0 }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {debt.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}>
            {Number(debt.interest_rate) > 0 && <span>{debt.interest_rate}%/mês</span>}
            {monthlyInterest > 0 && (
              <>
                <span>·</span>
                <span style={{ color: '#dc2626' }}>R$ {fmtCompact(monthlyInterest)}/mês juros</span>
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--color-text-strong)', letterSpacing: '-0.02em' }}>
            {fmt(Number(debt.remaining_amount))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>restante</div>
        </div>
        <ChevronDown size={16} color="var(--color-text-muted)" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--color-bg-sunken)', margin: '0 16px' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: barColor, borderRadius: 99 }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--color-border-ghost)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Pago', value: `${pct.toFixed(0)}%` },
                  { label: 'Parcela mín.', value: Number(debt.min_payment) > 0 ? fmt(Number(debt.min_payment)) : '—' },
                  { label: 'Total original', value: fmt(Number(debt.total_amount)) },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--color-bg-sunken)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); onPay(); }}
                  style={{ flex: 1, height: 40, background: 'var(--color-green-600)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  💰 Registrar pagamento
                </motion.button>
                <div style={{ position: 'relative' }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    style={{ width: 40, height: 40, background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-base)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MoreVertical size={14} color="var(--color-text-muted)" />
                  </motion.button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div style={{ position: 'absolute', right: 0, top: 44, zIndex: 50, width: 180, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-base)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 4, overflow: 'hidden' }}>
                        {debt.status === 'active' ? (
                          <MenuBtn icon={<Pause size={13} />} label="Pausar" onClick={() => { onStatusChange('paused'); setShowMenu(false); }} />
                        ) : (
                          <MenuBtn icon={<Play size={13} />} label="Reativar" onClick={() => { onStatusChange('active'); setShowMenu(false); }} />
                        )}
                        <MenuBtn icon={<Check size={13} />} label="Marcar quitada" color="var(--success-text)" onClick={() => { onStatusChange('paid'); setShowMenu(false); }} />
                        <MenuBtn icon={<Trash2 size={13} />} label="Excluir" color="#dc2626" onClick={() => { setConfirmDelete(true); setShowMenu(false); }} />
                      </div>
                    </>
                  )}
                </div>
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

/* ─── MenuBtn ─── */
function MenuBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: color || 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'background 100ms' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-sunken)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      {icon} {label}
    </button>
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
function AddDebtSheet({ open, onClose, formType, setFormType, formName, setFormName, formCreditor, setFormCreditor, formTotal, setFormTotal, formRemaining, setFormRemaining, formInterest, setFormInterest, formMinPayment, setFormMinPayment, formShowMore, setFormShowMore, submitting, onSubmit }: {
  open: boolean; onClose: () => void;
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

  return (
    <BottomSheet open={open} onClose={onClose} title="Nova Dívida">
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

        {/* Name */}
        <div>
          <span style={labelStyle}>Nome da dívida</span>
          <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Cartão Nubank" style={inputStyle} />
        </div>

        {/* Total */}
        <div>
          <span style={labelStyle}>Valor total devido</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 }}>R$</span>
            <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formTotal} onChange={e => setFormTotal(e.target.value)} placeholder="0,00" style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
        </div>

        {/* Interest */}
        <div>
          <span style={labelStyle}>Taxa de juros (% ao mês)</span>
          <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formInterest} onChange={e => setFormInterest(e.target.value)} placeholder="0,00" style={inputStyle} />
          {formInterest && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>≈ {(Math.pow(1 + Number(formInterest) / 100, 12) * 100 - 100).toFixed(0)}% ao ano</span>}
        </div>

        {/* Min payment */}
        <div>
          <span style={labelStyle}>Pagamento mínimo (R$/mês)</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 }}>R$</span>
            <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={formMinPayment} onChange={e => setFormMinPayment(e.target.value)} placeholder="0,00" style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
        </div>

        {/* Show more toggle */}
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
          {submitting ? 'Cadastrando...' : 'Cadastrar Dívida'}
        </motion.button>
      </div>
    </BottomSheet>
  );
}

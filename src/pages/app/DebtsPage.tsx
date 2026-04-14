import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  AlertCircle, DollarSign, TrendingUp, Target, Calendar,
  ChevronDown, ChevronRight, Shield, PlusCircle, MoreVertical,
  Pencil, Pause, Play, Check, Trash2, GripVertical, X,
  ArrowRight, Sparkles
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';

// ─── Types ───
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
  { val: 'credit_card', label: 'Cartão de Crédito', emoji: '💳' },
  { val: 'personal_loan', label: 'Empréstimo Pessoal', emoji: '🏦' },
  { val: 'bank_loan', label: 'Empréstimo Bancário', emoji: '🏛️' },
  { val: 'overdraft', label: 'Cheque Especial', emoji: '📊' },
  { val: 'friend_family', label: 'Amigos/Família', emoji: '👥' },
  { val: 'store_credit', label: 'Crediário/Loja', emoji: '🏪' },
  { val: 'medical', label: 'Dívida Médica', emoji: '🏥' },
  { val: 'tax', label: 'Impostos/Multas', emoji: '📋' },
  { val: 'other', label: 'Outra', emoji: '🔄' },
];

const COLORS = ['#dc2626','#ea580c','#d97706','#ca8a04','#16a34a','#0891b2','#2563eb','#7c3aed'];

const TIPS = [
  { emoji: '🚫', title: 'Evite o rotativo do cartão', body: 'O rotativo é o crédito mais caro do Brasil — pode chegar a 400% ao ano. Sempre pague o valor total da fatura.' },
  { emoji: '📞', title: 'Negocie sua dívida', body: 'Credores preferem receber menos a não receber nada. Ligue e ofereça pagar 50-70% do valor à vista.' },
  { emoji: '💡', title: 'Use o Serasa Limpa Nome', body: 'O Serasa oferece negociações com grandes descontos diretamente pelo app. Vale verificar se suas dívidas estão lá.' },
  { emoji: '🔄', title: 'Portabilidade de crédito', body: 'Você pode transferir sua dívida para um banco com juros menores. Isso pode reduzir seus juros pela metade.' },
  { emoji: '💰', title: 'Renda extra para dívidas', body: 'Todo real de renda extra deve ir direto para a dívida prioritária. Freelance, vendas, bicos — cada R$ 100 extra economiza muito em juros.' },
  { emoji: '📊', title: 'Regra 50/30/20 emergencial', body: 'Em modo de quitação, mude para 70/10/20: 70% necessidades, 10% emergência, 20% dívidas extra.' },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche' | 'custom'>('snowball');
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const [paymentModal, setPaymentModal] = useState<Debt | null>(null);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [extraPayment, setExtraPayment] = useState(0);
  const [step2Checks, setStep2Checks] = useState<boolean[]>(() => {
    try { return JSON.parse(localStorage.getItem('debt_step2_checks') || '[]') || [false,false,false,false,false]; }
    catch { return [false,false,false,false,false]; }
  });

  // Form state
  const [formType, setFormType] = useState('credit_card');
  const [formName, setFormName] = useState('');
  const [formCreditor, setFormCreditor] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formRemaining, setFormRemaining] = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formMinPayment, setFormMinPayment] = useState('');
  const [formDueDay, setFormDueDay] = useState('');
  const [formColor, setFormColor] = useState('#dc2626');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment modal state
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Compound calc
  const [compMonthly, setCompMonthly] = useState(500);
  const [compYears, setCompYears] = useState(10);
  const [compRate, setCompRate] = useState(1);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [dRes, pRes] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', user.id).order('priority', { ascending: true }),
      supabase.from('debt_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
    ]);
    setDebts((dRes.data as Debt[]) || []);
    setPayments((pRes.data as DebtPayment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    localStorage.setItem('debt_step2_checks', JSON.stringify(step2Checks));
  }, [step2Checks]);

  const activeDebts = debts.filter(d => d.status === 'active');
  const paidDebts = debts.filter(d => d.status === 'paid');
  const totalRemaining = activeDebts.reduce((s, d) => s + Number(d.remaining_amount), 0);
  const monthlyInterest = activeDebts.reduce((s, d) => s + Number(d.remaining_amount) * Number(d.interest_rate) / 100, 0);
  const smallestDebt = activeDebts.length ? activeDebts.reduce((min, d) => Number(d.remaining_amount) < Number(min.remaining_amount) ? d : min, activeDebts[0]) : null;

  const orderedDebts = useMemo(() => {
    const a = [...activeDebts];
    if (strategy === 'snowball') a.sort((x, y) => Number(x.remaining_amount) - Number(y.remaining_amount));
    else if (strategy === 'avalanche') a.sort((x, y) => Number(y.interest_rate) - Number(x.interest_rate));
    else a.sort((x, y) => x.priority - y.priority);
    return a;
  }, [activeDebts, strategy]);

  // Payoff projection
  const projectionData = useMemo(() => {
    if (!activeDebts.length) return [];
    const months: { month: string; minOnly: number; withExtra: number }[] = [];
    let remMin = activeDebts.map(d => ({ ...d, rem: Number(d.remaining_amount) }));
    let remExtra = activeDebts.map(d => ({ ...d, rem: Number(d.remaining_amount) }));
    const now = new Date();
    for (let m = 0; m < 120; m++) {
      const date = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const totalMin = remMin.reduce((s, d) => s + d.rem, 0);
      const totalExtra = remExtra.reduce((s, d) => s + d.rem, 0);
      months.push({ month: label, minOnly: Math.max(0, totalMin), withExtra: Math.max(0, totalExtra) });
      if (totalMin <= 0 && totalExtra <= 0) break;
      // Apply min payments
      remMin = remMin.map(d => {
        if (d.rem <= 0) return d;
        const interest = d.rem * Number(d.interest_rate) / 100;
        const newRem = d.rem + interest - Number(d.min_payment);
        return { ...d, rem: Math.max(0, newRem) };
      });
      // Apply extra payments
      let extraLeft = extraPayment;
      const sorted = strategy === 'avalanche'
        ? [...remExtra].sort((a, b) => Number(b.interest_rate) - Number(a.interest_rate))
        : [...remExtra].sort((a, b) => a.rem - b.rem);
      remExtra = remExtra.map(d => {
        if (d.rem <= 0) return d;
        const interest = d.rem * Number(d.interest_rate) / 100;
        let pay = Number(d.min_payment);
        const focusDebt = sorted.find(s => s.rem > 0);
        if (focusDebt && focusDebt.id === d.id && extraLeft > 0) {
          pay += extraLeft;
          extraLeft = 0;
        }
        const newRem = d.rem + interest - pay;
        return { ...d, rem: Math.max(0, newRem) };
      });
    }
    return months;
  }, [activeDebts, extraPayment, strategy]);

  // Step status
  const step1Done = debts.length > 0;
  const step2Done = step2Checks.every(Boolean);
  const step3Done = false; // Would check goals for emergency fund
  const step4Active = step1Done;
  const step5Done = activeDebts.length === 0 && paidDebts.length > 0;

  // Payoff estimate
  const estimatedPayoff = useMemo(() => {
    if (!activeDebts.length) return 'N/A';
    let rem = activeDebts.map(d => ({ rem: Number(d.remaining_amount), rate: Number(d.interest_rate), min: Number(d.min_payment) }));
    for (let m = 1; m <= 360; m++) {
      rem = rem.map(d => {
        if (d.rem <= 0) return d;
        const interest = d.rem * d.rate / 100;
        return { ...d, rem: Math.max(0, d.rem + interest - d.min) };
      });
      if (rem.every(d => d.rem <= 0)) {
        const date = new Date();
        date.setMonth(date.getMonth() + m);
        return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      }
    }
    return '30+ anos';
  }, [activeDebts]);

  const compoundResult = useMemo(() => {
    let total = 0;
    for (let m = 0; m < compYears * 12; m++) {
      total = (total + compMonthly) * (1 + compRate / 100);
    }
    return total;
  }, [compMonthly, compYears, compRate]);

  const handleAddDebt = async () => {
    if (!user || !formName || !formCreditor || !formTotal) return;
    setSubmitting(true);
    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      name: formName,
      creditor: formCreditor,
      total_amount: parseFloat(formTotal),
      remaining_amount: parseFloat(formRemaining || formTotal),
      interest_rate: parseFloat(formInterest || '0'),
      min_payment: parseFloat(formMinPayment || '0'),
      due_day: formDueDay ? parseInt(formDueDay) : null,
      debt_type: formType,
      color: formColor,
      notes: formNotes || null,
      strategy,
      priority: debts.length,
    });
    setSubmitting(false);
    if (error) { toast.error('Erro ao cadastrar dívida'); return; }
    toast.success('Dívida cadastrada!');
    setFormName(''); setFormCreditor(''); setFormTotal(''); setFormRemaining('');
    setFormInterest(''); setFormMinPayment(''); setFormDueDay(''); setFormNotes('');
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
        user_id: user.id,
        debt_id: paymentModal.id,
        amount,
        payment_date: payDate,
        notes: payNotes || null,
      }),
      supabase.from('debts').update({
        remaining_amount: newRemaining,
        status: newStatus,
      }).eq('id', paymentModal.id),
    ]);

    setPaySubmitting(false);
    if (payRes.error || updRes.error) { toast.error('Erro ao registrar pagamento'); return; }

    if (newStatus === 'paid') {
      confetti({ particleCount: 200, spread: 90, colors: ['#16a34a','#22c55e','#d97706','#ffffff'] });
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
      confetti({ particleCount: 200, spread: 90, colors: ['#16a34a','#22c55e','#d97706','#ffffff'] });
    }
    await supabase.from('debts').update({ status }).eq('id', id);
    toast.success(status === 'paid' ? '🏆 Dívida quitada!' : status === 'paused' ? 'Dívida pausada' : 'Dívida reativada');
    fetchData();
  };

  const scrollToForm = () => {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ═══ 1. HERO BANNER ═══ */}
      {debts.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center gap-3.5">
          <div className="w-[88px] h-[88px] rounded-full bg-secondary flex items-center justify-center">
            <Shield className="w-10 h-10 text-[#86efac]" />
          </div>
          <h2 className="text-[17px] font-black text-foreground">Nenhuma dívida cadastrada</h2>
          <p className="text-[14px] text-muted-foreground max-w-[320px] leading-relaxed">
            Se você tem dívidas, cadastre-as aqui para receber um plano personalizado para quitá-las.
          </p>
          <button onClick={scrollToForm}
            className="bg-[#dc2626] text-white font-extrabold text-[13px] px-5 py-2.5 rounded-[9px] hover:bg-[#b91c1c] transition-colors">
            + Cadastrar minha primeira dívida
          </button>
        </div>
      ) : activeDebts.length === 0 ? (
        <div className="bg-secondary border-[1.5px] border-[#d4edda] rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-black text-foreground">Você está livre das dívidas!</h2>
          <p className="text-[14px] text-muted-foreground mt-2">Parabéns! Agora é hora de investir e construir riqueza.</p>
          <a href="/app/investments" className="inline-block mt-4 bg-[#16a34a] text-white font-bold text-[13px] px-5 py-2.5 rounded-[9px] hover:bg-[#14532d] transition-colors">
            Começar a investir →
          </a>
        </div>
      ) : (
        <div className="bg-card border-l-4 border-l-[#dc2626] border-[1.5px] border-[#fecaca] rounded-r-2xl px-6 py-5 flex items-center gap-4 flex-wrap">
          <AlertCircle className="w-8 h-8 text-[#dc2626] flex-shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-[17px] font-black text-[#991b1b]">Você tem {activeDebts.length} dívida(s) ativa(s)</h2>
            <p className="text-[13px] text-[#dc2626] font-medium">Total: {fmt(totalRemaining)} em dívidas. Juros acumulando {fmt(monthlyInterest)}/mês.</p>
            <p className="text-[12px] text-muted-foreground mt-1">Cada pagamento extra te aproxima da liberdade financeira. Você consegue! 💪</p>
          </div>
          <button onClick={() => document.getElementById('strategy-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#dc2626] text-white font-bold text-[12px] px-4 py-2 rounded-lg hover:bg-[#b91c1c] transition-colors flex-shrink-0">
            Ver meu plano ↓
          </button>
        </div>
      )}

      {/* ═══ 2. STATS ═══ */}
      {debts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: DollarSign, bg: '#fee2e2', ic: '#dc2626', label: 'Total em Dívidas', value: fmt(totalRemaining), sub: 'Saldo devedor total', color: '#dc2626' },
            { icon: AlertCircle, bg: '#fef2f2', ic: '#dc2626', label: 'Dívidas Ativas', value: String(activeDebts.length), sub: 'dívidas em aberto', color: '#dc2626' },
            { icon: TrendingUp, bg: '#fffbeb', ic: '#d97706', label: 'Juros/Mês', value: fmt(monthlyInterest), sub: 'Custo mensal dos juros', color: '#d97706' },
            { icon: Target, bg: '#f0fdf4', ic: '#16a34a', label: 'Menor Dívida', value: smallestDebt ? fmt(Number(smallestDebt.remaining_amount)) : '-', sub: smallestDebt?.name || '-', color: '#16a34a' },
            { icon: Calendar, bg: '#eff6ff', ic: '#2563eb', label: 'Previsão Quitação', value: estimatedPayoff, sub: 'Pagando o mínimo', color: '#2563eb' },
          ].map((c, i) => (
            <div key={i} className="bg-card border-[1.5px] border-border rounded-xl p-4 flex items-center gap-3.5 hover:border-[#86efac] transition-colors">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                <c.icon className="w-[18px] h-[18px]" style={{ color: c.ic }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-[18px] font-black truncate" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ 3. STRATEGY ═══ */}
      {activeDebts.length > 0 && (
        <div id="strategy-section" className="bg-card border-[1.5px] border-border rounded-2xl p-6">
          <h3 className="text-[15px] font-black text-foreground">Escolha sua estratégia de quitação</h3>
          <p className="text-[13px] text-muted-foreground mb-5">A estratégia define a ordem em que você deve priorizar o pagamento das dívidas.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { key: 'snowball' as const, emoji: '❄️', name: 'Bola de Neve', badge: 'Mais popular', badgeBg: '#dcfce7', badgeColor: '#166534',
                desc: 'Quite primeiro as dívidas de MENOR valor, independente dos juros. Cada dívida quitada te dá mais motivação para continuar.',
                pros: ['Mais motivador — vitórias rápidas', 'Reduz o número de dívidas rapidamente', 'Recomendado por Dave Ramsey'],
                use: 'Ideal para quem precisa de motivação' },
              { key: 'avalanche' as const, emoji: '🏔️', name: 'Avalanche', badge: 'Economiza mais', badgeBg: '#fffbeb', badgeColor: '#92400e',
                desc: 'Quite primeiro as dívidas de MAIOR juros. Matematicamente a melhor opção — você paga menos juros no total.',
                pros: ['Economiza mais dinheiro no longo prazo', 'Matematicamente otimizado', 'Recomendado por economistas'],
                use: 'Ideal para quem quer pagar menos juros' },
              { key: 'custom' as const, emoji: '🎯', name: 'Personalizada', badge: '', badgeBg: '', badgeColor: '',
                desc: 'Você define a ordem de prioridade de cada dívida manualmente conforme sua situação.',
                pros: ['Flexibilidade total', 'Considera fatores pessoais', 'Você no controle'],
                use: 'Ideal para situações específicas' },
            ].map(s => (
              <button key={s.key} onClick={() => setStrategy(s.key)}
                className={`text-left border-[1.5px] rounded-[14px] p-[18px] transition-all cursor-pointer ${
                  strategy === s.key ? 'border-[#16a34a] border-2 bg-secondary' : 'border-border hover:border-[#d4edda]'
                }`}>
                {s.badge && (
                  <span className="text-[10px] font-extrabold px-2 py-[2px] rounded-md mb-2 inline-block" style={{ background: s.badgeBg, color: s.badgeColor }}>{s.badge}</span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-11 h-11 rounded-full bg-[#eff6ff] flex items-center justify-center text-2xl">{s.emoji}</div>
                  <span className="text-[14px] font-extrabold text-foreground">{s.name}</span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{s.desc}</p>
                {s.pros.map((p, i) => (
                  <p key={i} className="text-[12px] text-[#16a34a] font-semibold">✓ {p}</p>
                ))}
                <p className="text-[11px] italic text-muted-foreground mt-2">{s.use}</p>
              </button>
            ))}
          </div>
          {orderedDebts.length > 0 && (
            <div className="mt-4 bg-background rounded-lg p-3 text-[13px] text-foreground">
              <span className="font-bold">Com esta estratégia, você quitará primeiro: </span>
              {orderedDebts.slice(0, 3).map(d => d.name).join(' → ')}
            </div>
          )}
        </div>
      )}

      {/* ═══ 4. STEP-BY-STEP GUIDE ═══ */}
      {debts.length > 0 && (
        <div className="bg-card border-[1.5px] border-border rounded-2xl p-6">
          <h3 className="text-[15px] font-black text-foreground">Seu plano passo a passo</h3>
          <p className="text-[13px] text-muted-foreground mb-5">Siga estes passos na ordem para sair das dívidas o mais rápido possível.</p>
          <div className="space-y-0">
            {[
              {
                num: 1, title: 'Liste todas as suas dívidas', done: step1Done,
                current: !step1Done,
                desc: 'O primeiro passo é encarar a realidade. Cadastre TODAS as suas dívidas aqui.',
                action: 'Cadastre todas as dívidas no formulário abaixo',
                progress: `${debts.length} dívidas cadastradas`,
                cta: !step1Done ? { label: 'Cadastrar dívida ↓', fn: scrollToForm } : null,
              },
              {
                num: 2, title: 'Congele os gastos desnecessários', done: step2Done,
                current: step1Done && !step2Done,
                desc: 'De nada adianta pagar dívidas se você continua criando novas.',
                action: 'Complete a checklist abaixo',
                progress: `${step2Checks.filter(Boolean).length}/5 itens concluídos`,
                checklist: ['Cancelei assinaturas desnecessárias', 'Reduzi gastos com alimentação fora', 'Parei de parcelar compras novas', 'Guardei os cartões de crédito', 'Defini orçamento mensal de emergência'],
              },
              {
                num: 3, title: 'Guarde R$ 1.000 antes de tudo', done: step3Done,
                current: step2Done && !step3Done,
                desc: 'Antes de pagar dívidas com força total, guarde R$ 1.000 de reserva de emergência.',
                action: 'Crie uma meta "Reserva de Emergência" de R$ 1.000',
                cta: { label: 'Criar esta meta →', fn: () => window.location.href = '/app/goals' },
              },
              {
                num: 4, title: 'Execute sua estratégia de quitação', done: false,
                current: step4Active,
                desc: strategy === 'snowball' 
                  ? `Foque na menor dívida: ${orderedDebts[0]?.name || '-'} (${orderedDebts[0] ? fmt(Number(orderedDebts[0].remaining_amount)) : '-'})`
                  : `Foque na maior taxa: ${orderedDebts[0]?.name || '-'} (${orderedDebts[0]?.interest_rate || 0}% a.m.)`,
                action: 'Pague o mínimo em todas, exceto na dívida foco',
                progress: `${paidDebts.length} de ${debts.length} dívidas quitadas`,
              },
              {
                num: 5, title: 'Transforme as parcelas em investimentos', done: step5Done,
                current: false,
                desc: 'Quando quitar uma dívida, NÃO aumente seus gastos. Redirecione o valor para investimentos.',
              },
            ].map((step, idx) => (
              <div key={step.num} className="flex gap-4 pb-6 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black flex-shrink-0 ${
                    step.done ? 'bg-[#16a34a] text-white' : step.current ? 'bg-[#dc2626] text-white' : 'bg-muted/30 text-muted-foreground'
                  }`}>
                    {step.done ? <Check className="w-5 h-5" /> : step.num}
                  </div>
                  {idx < 4 && <div className={`w-[2px] flex-1 mt-1 ${step.done ? 'bg-[#d4edda]' : 'bg-muted/30'}`} />}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <h4 className={`text-[15px] font-extrabold ${step.done ? 'text-foreground' : step.current ? 'text-[#991b1b]' : 'text-muted-foreground'}`}>{step.title}</h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{step.desc}</p>
                  {step.action && (
                    <div className="mt-2 border border-[#d4edda] rounded-lg p-2.5 bg-accent/50">
                      <p className="text-[10px] uppercase font-bold text-[#16a34a]">Faça isso agora:</p>
                      <p className="text-[13px] text-foreground font-semibold">{step.action}</p>
                    </div>
                  )}
                  {step.progress && <p className="text-[12px] text-muted-foreground mt-2 font-semibold">{step.progress}</p>}
                  {step.done && <span className="inline-block mt-2 text-[11px] font-bold text-[#16a34a] bg-[#dcfce7] px-2.5 py-1 rounded-md">✓ Concluído</span>}
                  {step.cta && step.current && (
                    <button onClick={step.cta.fn} className="mt-2 text-[12px] font-bold text-white bg-[#dc2626] px-4 py-1.5 rounded-lg hover:bg-[#b91c1c] transition-colors">
                      {step.cta.label}
                    </button>
                  )}
                  {step.checklist && (
                    <div className="mt-3 space-y-2">
                      {step.checklist.map((item, ci) => (
                        <label key={ci} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={step2Checks[ci] || false}
                            onChange={() => { const n = [...step2Checks]; n[ci] = !n[ci]; setStep2Checks(n); }}
                            className="w-4 h-4 rounded border-border text-[#16a34a] focus:ring-[#16a34a]" />
                          <span className={`text-[13px] ${step2Checks[ci] ? 'text-[#16a34a] line-through' : 'text-foreground'}`}>{item}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Step 4 extra payment calculator */}
          {step4Active && activeDebts.length > 0 && (
            <div className="mt-4 bg-background rounded-xl p-4 border border-border">
              <p className="text-[13px] font-bold text-foreground mb-2">Quanto você pode pagar extra por mês?</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[13px] text-muted-foreground font-semibold">R$</span>
                <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={extraPayment || ''} onChange={e => setExtraPayment(Number(e.target.value))}
                  placeholder="0" className="w-32 h-9 border-[1.5px] border-border rounded-lg px-3 text-[14px] font-bold focus:border-[#16a34a] outline-none" />
              </div>
              {extraPayment > 0 && orderedDebts[0] && (
                <p className="text-[13px] text-[#16a34a] font-semibold">
                  Pagando {fmt(extraPayment)} extra, você quitará {orderedDebts[0].name} mais rápido!
                </p>
              )}
            </div>
          )}

          {/* Step 5 compound interest calculator */}
          {paidDebts.length > 0 && (
            <div className="mt-4 bg-secondary rounded-xl p-4 border border-[#d4edda]">
              <p className="text-[13px] font-bold text-foreground mb-3">Calculadora de investimento</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Aporte mensal</label>
                  <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={compMonthly} onChange={e => setCompMonthly(Number(e.target.value))}
                    className="w-full h-9 border-[1.5px] border-[#d4edda] rounded-lg px-3 text-[13px] font-bold focus:border-[#16a34a] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Anos</label>
                  <input type="range" min={1} max={30} value={compYears} onChange={e => setCompYears(Number(e.target.value))}
                    className="w-full mt-2" />
                  <p className="text-[12px] text-center font-bold text-foreground">{compYears} anos</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Taxa %/mês</label>
                  <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={compRate} onChange={e => setCompRate(Number(e.target.value))}
                    className="w-full h-9 border-[1.5px] border-[#d4edda] rounded-lg px-3 text-[13px] font-bold focus:border-[#16a34a] outline-none" />
                </div>
              </div>
              <p className="text-[14px] font-black text-[#16a34a]">Em {compYears} anos você terá {fmt(compoundResult)}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ 5. MY DEBTS LIST ═══ */}
      {debts.length > 0 && (
        <div className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-black text-foreground">Minhas Dívidas</h3>
              {activeDebts.length > 0 && (
                <span className="text-[10px] font-extrabold bg-[#dc2626] text-white px-[6px] py-[1px] rounded-full">{activeDebts.length}</span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {strategy === 'snowball' ? '❄️ Bola de Neve' : strategy === 'avalanche' ? '🏔️ Avalanche' : '🎯 Personalizada'}
            </span>
          </div>

          {orderedDebts.map((debt, idx) => (
            <DebtRow key={debt.id} debt={debt} isFocus={idx === 0} onPay={() => { setPaymentModal(debt); setPayAmount(''); setPayDate(new Date().toISOString().split('T')[0]); setPayNotes(''); }}
              onDelete={() => handleDeleteDebt(debt.id)}
              onStatusChange={(s) => handleStatusChange(debt.id, s)}
            />
          ))}

          {/* Paid debts */}
          {paidDebts.length > 0 && (
            <div className="border-t-2 border-[#d97706]">
              <button onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
                className="w-full px-5 py-3 flex items-center gap-2 text-[13px] font-bold text-[#92400e] hover:bg-[#fffbeb] transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryBreakdown ? 'rotate-180' : ''}`} />
                🏆 Dívidas Quitadas ({paidDebts.length})
              </button>
              <AnimatePresence>
                {showCategoryBreakdown && paidDebts.map(debt => (
                  <motion.div key={debt.id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="px-5 py-3 border-t border-border/30 bg-[#fffbeb]/30 flex items-center gap-3">
                    <span className="text-[14px]">🏆</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-[#92400e]">{debt.name}</p>
                      <p className="text-[11px] text-muted-foreground">{debt.creditor} · {fmt(Number(debt.total_amount))}</p>
                    </div>
                    <span className="text-[12px] font-bold text-[#16a34a]">✓ Quitada</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ═══ 6. ADD DEBT FORM ═══ */}
      <div ref={formRef} className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[#dc2626]" />
            <span className="text-[14px] font-extrabold text-foreground">Cadastrar Nova Dívida</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-5 border-t border-border/50">
                {/* Type tiles */}
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-2">Tipo de dívida</p>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 mb-5">
                  {DEBT_TYPES.map(t => (
                    <button key={t.val} onClick={() => setFormType(t.val)}
                      className={`min-h-[80px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] transition-all ${
                        formType === t.val ? 'border-2 border-[#dc2626] bg-[#fef2f2]' : 'border-border hover:border-[#fecaca]'
                      }`}>
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="text-[11px] font-semibold text-foreground text-center leading-tight px-1">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Nome da dívida" value={formName} onChange={setFormName} placeholder="Ex: Cartão Nubank" />
                  <FormField label="Credor" value={formCreditor} onChange={setFormCreditor} placeholder="Ex: Nubank, Banco Itaú" />
                  <FormField label="Valor total" value={formTotal} onChange={setFormTotal} placeholder="0,00" type="number" prefix="R$" />
                  <div>
                    <FormField label="Quanto ainda devo" value={formRemaining} onChange={setFormRemaining} placeholder="0,00" type="number" prefix="R$" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Se não sabe, use o valor total</p>
                  </div>
                  <div className="relative">
                    <FormField label="Taxa de juros (% a.m.)" value={formInterest} onChange={setFormInterest} placeholder="0,00" type="number" />
                    <div className="group relative inline-block ml-1">
                      <span className="text-[10px] text-[#16a34a] font-bold cursor-help underline">Como encontrar?</span>
                      <div className="hidden group-hover:block absolute left-0 bottom-full mb-1 w-64 bg-card border border-border rounded-lg p-3 shadow-lg z-10 text-[11px] text-muted-foreground leading-relaxed">
                        Cartão de crédito: 15-20%/mês<br />Cheque especial: 8-12%/mês<br />Empréstimo pessoal: 2-8%/mês<br />Financiamento: 0.8-3%/mês
                      </div>
                    </div>
                  </div>
                  <FormField label="Pagamento mínimo (R$/mês)" value={formMinPayment} onChange={setFormMinPayment} placeholder="0,00" type="number" prefix="R$" />
                  <FormField label="Dia de vencimento" value={formDueDay} onChange={setFormDueDay} placeholder="1-31" type="number" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Cor</p>
                    <div className="flex gap-2">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setFormColor(c)}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${formColor === c ? 'border-[#14532d] scale-110' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <FormField label="Observações (opcional)" value={formNotes} onChange={setFormNotes} placeholder="Notas sobre a dívida..." textarea />
                </div>

                <button onClick={handleAddDebt} disabled={submitting || !formName || !formCreditor || !formTotal}
                  className="mt-4 bg-[#dc2626] text-white font-extrabold text-[13px] px-5 py-2.5 rounded-[9px] hover:bg-[#b91c1c] disabled:opacity-50 transition-all">
                  {submitting ? 'Cadastrando...' : 'Cadastrar Dívida'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ 7. PAYMENT HISTORY ═══ */}
      {payments.length > 0 && (
        <div className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-black text-foreground">Histórico de Pagamentos</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-[#16a34a]">Total pago: {fmt(totalPaid)}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="border-t border-border/50">
                  <div className="grid grid-cols-5 gap-2 px-5 py-2.5 bg-background text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
                    <span>Data</span><span>Dívida</span><span>Valor Pago</span><span>Notas</span><span></span>
                  </div>
                  {payments.slice(0, 20).map(p => {
                    const debt = debts.find(d => d.id === p.debt_id);
                    return (
                      <div key={p.id} className="grid grid-cols-5 gap-2 px-5 py-3 border-t border-border/30 items-center text-[13px] border-l-[3px] border-l-[#16a34a]">
                        <span className="text-muted-foreground font-medium">{new Date(p.payment_date).toLocaleDateString('pt-BR')}</span>
                        <span className="font-bold text-foreground truncate">{debt?.name || '-'}</span>
                        <span className="font-black text-[#16a34a]">{fmt(Number(p.amount))}</span>
                        <span className="text-muted-foreground text-[12px] truncate">{p.notes || '-'}</span>
                        <span></span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ 8. PROJECTION CHART ═══ */}
      {activeDebts.length > 0 && projectionData.length > 1 && (
        <div className="bg-card border-[1.5px] border-border rounded-2xl p-6">
          <h3 className="text-[15px] font-black text-foreground">Projeção de Quitação</h3>
          <p className="text-[13px] text-muted-foreground mb-4">Simule quanto tempo vai levar para quitar tudo</p>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-[12px] font-bold text-muted-foreground">Pagamento extra mensal:</label>
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-muted-foreground">R$</span>
              <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={extraPayment || ''} onChange={e => setExtraPayment(Number(e.target.value))}
                placeholder="0" className="w-28 h-8 border-[1.5px] border-border rounded-lg px-2 text-[13px] font-bold focus:border-[#16a34a] outline-none" />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={Math.max(1, Math.floor(projectionData.length / 8))} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <ReferenceLine y={0} stroke="#16a34a" strokeDasharray="4 4" label={{ value: 'Livre!', fill: '#16a34a', fontSize: 11, fontWeight: 700 }} />
                {extraPayment > 0 && <Area dataKey="withExtra" fill="#dcfce7" stroke="none" fillOpacity={0.5} />}
                <Line type="monotone" dataKey="minOnly" stroke="#dc2626" strokeDasharray="6 3" strokeWidth={2} dot={false} name="Só mínimo" />
                {extraPayment > 0 && <Line type="monotone" dataKey="withExtra" stroke="#16a34a" strokeWidth={2} dot={false} name="Com extra" />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Summary boxes */}
          {extraPayment > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#fef2f2] rounded-xl p-4">
                <p className="text-[12px] font-bold text-[#991b1b] mb-1">Só o mínimo</p>
                <p className="text-[11px] text-[#dc2626]">Total restante ao final: {fmt(projectionData[projectionData.length - 1]?.minOnly || 0)}</p>
              </div>
              <div className="bg-secondary rounded-xl p-4">
                <p className="text-[12px] font-bold text-[#166534] mb-1">Com {fmt(extraPayment)} extra</p>
                <p className="text-[11px] text-[#16a34a]">Total restante ao final: {fmt(projectionData[projectionData.length - 1]?.withExtra || 0)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 9. TIPS CAROUSEL ═══ */}
      <div>
        <h3 className="text-[15px] font-black text-foreground mb-3">Dicas para sair das dívidas mais rápido</h3>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {TIPS.map((tip, i) => (
            <div key={i} className="bg-card border-[1.5px] border-border rounded-[14px] p-[18px] min-w-[280px] flex-shrink-0">
              <span className="text-[28px] block mb-2">{tip.emoji}</span>
              <h4 className="text-[13px] font-extrabold text-foreground mb-1.5">{tip.title}</h4>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PAYMENT MODAL (BottomSheet on mobile) ═══ */}
      <BottomSheet open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Registrar Pagamento">
        {paymentModal && (
          <div>
            <p className="text-[14px] text-foreground font-bold mb-3">{paymentModal.name}</p>

            <div className="bg-[#fef2f2] rounded-[10px] p-3 mb-4">
              <p className="text-[13px] font-bold text-[#dc2626]">Saldo atual: {fmt(Number(paymentModal.remaining_amount))}</p>
              <p className="text-[11px] text-muted-foreground">Juros estimados este mês: {fmt(Number(paymentModal.remaining_amount) * Number(paymentModal.interest_rate) / 100)}</p>
            </div>

            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Valor pago</p>
            <div className="flex items-center border-b-2 border-border pb-2 mb-2">
              <span className="text-[16px] text-muted-foreground mr-2">R$</span>
              <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder="0,00" className="flex-1 text-[20px] font-black text-foreground outline-none bg-transparent" autoFocus
                style={{ fontSize: 20 }} />
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { label: `Mínimo ${fmt(Number(paymentModal.min_payment))}`, val: Number(paymentModal.min_payment) },
                { label: 'R$ 100 extra', val: Number(paymentModal.min_payment) + 100 },
                { label: 'R$ 200 extra', val: Number(paymentModal.min_payment) + 200 },
                { label: 'Valor total', val: Number(paymentModal.remaining_amount) },
              ].map((p, i) => (
                <button key={i} onClick={() => setPayAmount(String(p.val))}
                  className="text-[11px] font-bold text-[#166534] bg-[#dcfce7] px-2.5 py-1 rounded-md hover:bg-[#bbf7d0] transition-colors">
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Data</p>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                  className="w-full h-9 border-[1.5px] border-border rounded-lg px-3 text-[13px] font-semibold focus:border-[#16a34a] outline-none" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Observação</p>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Opcional"
                  className="w-full h-9 border-[1.5px] border-border rounded-lg px-3 text-[13px] focus:border-[#16a34a] outline-none" />
              </div>
            </div>

            {payAmount && (
              <div className="bg-secondary rounded-[10px] p-3 mb-4">
                <p className="text-[12px] font-bold text-foreground mb-1">Após este pagamento:</p>
                <p className="text-[13px] text-[#16a34a] font-black">
                  Novo saldo: {fmt(Math.max(0, Number(paymentModal.remaining_amount) - Number(payAmount)))}
                </p>
                {Number(payAmount) >= Number(paymentModal.remaining_amount) && (
                  <p className="text-[13px] font-black text-[#16a34a] mt-1">🎉 Esta dívida será QUITADA!</p>
                )}
              </div>
            )}

            <button onClick={handlePayment} disabled={paySubmitting || !payAmount}
              className="w-full bg-[#16a34a] text-white font-extrabold text-[14px] py-3 rounded-xl hover:bg-[#14532d] disabled:opacity-50 transition-all"
              style={{ minHeight: 48 }}>
              {paySubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

// ─── Sub-components ───

function DebtRow({ debt, isFocus, onPay, onDelete, onStatusChange }: {
  debt: Debt; isFocus: boolean;
  onPay: () => void; onDelete: () => void;
  onStatusChange: (s: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const paid = Number(debt.total_amount) - Number(debt.remaining_amount);
  const pct = Number(debt.total_amount) > 0 ? (paid / Number(debt.total_amount)) * 100 : 0;
  const typeInfo = DEBT_TYPES.find(t => t.val === debt.debt_type);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="px-5 py-4 border-b border-border/30 hover:bg-[#fafafa] transition-colors group"
      style={{ borderLeft: `4px solid ${debt.color}` }}>
      <div className="flex items-start gap-3">
        {/* Priority */}
        <div className="flex-shrink-0 mt-0.5">
          {isFocus ? (
            <span className="text-[10px] font-extrabold bg-[#dc2626] text-white px-2 py-[3px] rounded-[5px] animate-pulse">FOCO</span>
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center text-[13px] font-extrabold text-muted-foreground">
              {debt.priority + 1}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-foreground">{debt.name}</span>
            <span className="text-[10px] font-bold text-muted-foreground bg-background px-1.5 py-[1px] rounded">{debt.creditor}</span>
            {typeInfo && <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-1.5 py-[1px] rounded">{typeInfo.emoji} {typeInfo.label}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[12px]">
            {Number(debt.interest_rate) > 0 && <span className="text-[#d97706] font-bold">💰 {debt.interest_rate}% a.m.</span>}
            {Number(debt.min_payment) > 0 && <span className="text-muted-foreground">Min: {fmt(Number(debt.min_payment))}/mês</span>}
            {debt.due_day && <span className="text-muted-foreground">Vence dia {debt.due_day}</span>}
          </div>
          {/* Progress */}
          <div className="mt-2.5">
            <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                className="h-full rounded-full" style={{ background: debt.color }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-[#16a34a] font-semibold">{fmt(paid)} pago</span>
              <span className="text-[11px] text-[#dc2626] font-semibold">{fmt(Number(debt.remaining_amount))} restante</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-[18px] font-black text-[#dc2626]">{fmt(Number(debt.remaining_amount))}</p>
          <p className="text-[12px] text-muted-foreground">de {fmt(Number(debt.total_amount))}</p>
          <p className={`text-[13px] font-bold ${pct > 50 ? 'text-[#16a34a]' : pct > 25 ? 'text-[#d97706]' : 'text-[#dc2626]'}`}>
            {pct.toFixed(0)}% pago
          </p>

          <div className="flex items-center gap-2">
            <button onClick={onPay}
              className="text-[12px] font-bold text-[#166534] bg-secondary border-[1.5px] border-[#d4edda] px-3 py-1.5 rounded-lg hover:bg-[#dcfce7] transition-colors">
              Registrar pagamento
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 z-50 w-48 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                    {debt.status === 'active' ? (
                      <button onClick={() => { onStatusChange('paused'); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:bg-background">
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </button>
                    ) : (
                      <button onClick={() => { onStatusChange('active'); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:bg-background">
                        <Play className="w-3.5 h-3.5" /> Reativar
                      </button>
                    )}
                    <button onClick={() => { onStatusChange('paid'); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#16a34a] hover:bg-secondary">
                      <Check className="w-3.5 h-3.5" /> Marcar como quitada
                    </button>
                    <button onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#dc2626] hover:bg-[#fef2f2]">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {confirmDelete && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-[#dc2626] font-bold">Excluir?</span>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="text-[11px] font-bold text-white bg-[#dc2626] px-2 py-0.5 rounded">Sim</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">Não</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', prefix, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; prefix?: string; textarea?: boolean;
}) {
  const isNumeric = type === 'number';
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">{label}</p>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={2} className="w-full border-[1.5px] border-border rounded-[9px] px-3 py-2 text-[13px] font-semibold focus:border-[#16a34a] outline-none resize-none" />
      ) : (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-semibold">{prefix}</span>}
          <input
            type={isNumeric ? 'text' : type}
            inputMode={isNumeric ? 'decimal' : undefined}
            pattern={isNumeric ? '[0-9.,]*' : undefined}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full h-[42px] border-[1.5px] border-border rounded-[9px] text-[13px] font-semibold focus:border-[#16a34a] outline-none ${prefix ? 'pl-8 pr-3' : 'px-3'}`}
          />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, TrendingUp, Wallet, Calendar, PlusCircle, ChevronDown,
  ChevronLeft, ChevronRight, AlertTriangle, Clock, Pencil, Trash2, X, Check
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

interface Card {
  id: string; user_id: string; name: string; credit_limit: number;
  used_amount: number; due_day: number | null; closing_day: number | null;
  color: string; network: string; last_four: string | null;
  notes: string | null; created_at: string;
}
interface Bill {
  id: string; user_id: string; card_id: string; month_year: string;
  total_amount: number; paid: boolean; paid_at: string | null;
}

const NETWORKS = [
  { val: 'visa', label: 'Visa' },
  { val: 'mastercard', label: 'Master' },
  { val: 'elo', label: 'Elo' },
  { val: 'amex', label: 'Amex' },
  { val: 'hipercard', label: 'Hiper' },
  { val: 'other', label: 'Outra' },
];
const CARD_COLORS = ['#7C3AED','#1A0D35','#2563eb','#7c3aed','#dc2626','#d97706','#0f766e','#db2777','#374151','#0f172a'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getMonthYear(offset = 0) {
  const d = new Date(); d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function fmtMonth(my: string) {
  const [y, m] = my.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function daysUntilDue(dueDay: number | null) {
  if (!dueDay) return 999;
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  const target = thisMonth >= now ? thisMonth : nextMonth;
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

// ─── Network Logo Component ───
function NetworkLogo({ network, size = 'normal' }: { network: string; size?: 'normal' | 'small' }) {
  const s = size === 'small' ? 0.7 : 1;
  if (network === 'visa') return <span className="text-white font-black italic" style={{ fontSize: 18 * s }}>VISA</span>;
  if (network === 'mastercard') return (
    <div className="flex" style={{ transform: `scale(${s})` }}>
      <div className="w-6 h-6 rounded-full bg-[#eb001b] opacity-90" />
      <div className="w-6 h-6 rounded-full bg-[#f79e1b] opacity-90 -ml-2.5" />
    </div>
  );
  if (network === 'elo') return <span className="text-white font-black" style={{ fontSize: 16 * s }}>elo</span>;
  if (network === 'amex') return <span className="text-white font-black" style={{ fontSize: 12 * s }}>AMEX</span>;
  if (network === 'hipercard') return <span className="text-white font-black" style={{ fontSize: 11 * s }}>HIPER</span>;
  return <span className="text-white/70 font-bold" style={{ fontSize: 12 * s }}>{network}</span>;
}

// ─── Visual Credit Card ───
function VisualCard({ card, onClick, onDelete, scale = 1 }: {
  card: Partial<Card>; onClick?: () => void; onDelete?: () => void; scale?: number;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const util = card.credit_limit ? (Number(card.used_amount || 0) / Number(card.credit_limit)) * 100 : 0;
  const barColor = util < 30 ? 'rgba(255,255,255,0.8)' : util < 70 ? 'rgba(251,191,36,0.9)' : 'rgba(239,68,68,0.9)';

  return (
    <div className="relative flex-shrink-0 w-full" style={{ maxWidth: 300 * scale, height: 178 * scale }}
      onMouseEnter={() => setShowDelete(true)} onMouseLeave={() => { setShowDelete(false); setConfirmDel(false); }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
        className="w-full h-full rounded-[18px] relative overflow-hidden cursor-pointer select-none"
        style={{ background: card.color || '#7C3AED', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={onClick}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.08]" />
        <div className="absolute -bottom-[50px] -left-[30px] w-[140px] h-[140px] rounded-full bg-white/[0.05]" />
        {/* Chip */}
        <div className="absolute top-[22px] left-[22px] w-[42px] h-[32px] rounded-[6px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #d4a843, #f0c060, #d4a843)' }}>
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-black/15" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-black/15" />
        </div>
        {/* Network */}
        <div className="absolute top-5 right-5"><NetworkLogo network={card.network || 'visa'} /></div>
        {/* Number */}
        <div className="absolute bottom-14 left-[22px] text-white font-semibold tracking-[3px] font-mono"
          style={{ fontSize: 16 * scale }}>
          •••• •••• •••• {card.last_four || '••••'}
        </div>
        {/* Name */}
        <div className="absolute bottom-5 left-[22px] text-white/90 font-bold uppercase tracking-wider truncate"
          style={{ fontSize: 13 * scale, maxWidth: 180 * scale, letterSpacing: 1 }}>
          {card.name || 'Novo Cartão'}
        </div>
        {/* Due */}
        {card.due_day && (
          <div className="absolute bottom-5 right-[22px] text-right">
            <p className="text-white/65 uppercase tracking-wider" style={{ fontSize: 9 * scale }}>VENCE DIA</p>
            <p className="text-white font-black" style={{ fontSize: 18 * scale }}>{card.due_day}</p>
          </div>
        )}
        {/* Utilization bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-[18px] overflow-hidden">
          <div className="h-full transition-all duration-500" style={{ width: `${Math.min(util, 100)}%`, background: barColor }} />
        </div>
      </motion.div>
      {/* Delete button */}
      {onDelete && showDelete && !confirmDel && (
        <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }}
          className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-[#dc2626] transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
      {confirmDel && (
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="text-[10px] font-bold text-white bg-[#dc2626] px-2 py-1 rounded">Excluir</button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDel(false); }}
            className="text-[10px] font-bold text-white bg-black/40 px-2 py-1 rounded">Não</button>
        </div>
      )}
    </div>
  );
}

// ─── Form Field ───
function FormField({ label, value, onChange, placeholder, type = 'text', prefix, helper }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; prefix?: string; helper?: string;
}) {
  const isNumeric = type === 'number';
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">{label}</p>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-semibold">{prefix}</span>}
        <input
          type={isNumeric ? 'text' : type}
          inputMode={isNumeric ? 'decimal' : undefined}
          pattern={isNumeric ? '[0-9.,]*' : undefined}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-[42px] border-[1.5px] border-border rounded-[9px] text-[13px] font-semibold focus:border-[#7C3AED] outline-none ${prefix ? 'pl-8 pr-3' : 'px-3'}`}
        />
      </div>
      {helper && <p className="text-[10px] text-muted-foreground mt-0.5">{helper}</p>}
    </div>
  );
}

// ═══ MAIN PAGE ═══
export default function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [payBillCard, setPayBillCard] = useState<Card | null>(null);
  const [billMonth, setBillMonth] = useState(getMonthYear());
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('card_alerts_dismissed') || '[]'); } catch { return []; }
  });

  // Form state
  const [fName, setFName] = useState('');
  const [fNetwork, setFNetwork] = useState('visa');
  const [fLastFour, setFLastFour] = useState('');
  const [fLimit, setFLimit] = useState('');
  const [fClosing, setFClosing] = useState('');
  const [fDue, setFDue] = useState('');
  const [fUsed, setFUsed] = useState('');
  const [fColor, setFColor] = useState('#7C3AED');
  const [submitting, setSubmitting] = useState(false);

  // Pay bill modal
  const [payOption, setPayOption] = useState<'total' | 'minimum' | 'custom'>('total');
  const [payCustom, setPayCustom] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Inline edit
  const [editingUsed, setEditingUsed] = useState<string | null>(null);
  const [editUsedVal, setEditUsedVal] = useState('');

  const formRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cRes, bRes] = await Promise.all([
      supabase.from('credit_cards').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('card_bills').select('*').eq('user_id', user.id),
    ]);
    setCards((cRes.data ?? []).map(c => ({ ...c, credit_limit: Number(c.credit_limit), used_amount: Number(c.used_amount) })) as Card[]);
    setBills((bRes.data ?? []).map(b => ({ ...b, total_amount: Number(b.total_amount) })) as Bill[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalLimit = cards.reduce((s, c) => s + c.credit_limit, 0);
  const totalUsed = cards.reduce((s, c) => s + c.used_amount, 0);
  const totalAvailable = totalLimit - totalUsed;
  const utilPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const nearestDue = useMemo(() => {
    if (!cards.length) return null;
    let best: Card | null = null; let bestDays = 999;
    cards.forEach(c => { const d = daysUntilDue(c.due_day); if (d < bestDays) { bestDays = d; best = c; } });
    return best ? { card: best, days: bestDays } : null;
  }, [cards]);

  // Alerts
  const alerts = useMemo(() => {
    const a: { id: string; type: 'high' | 'soon' | 'today'; card: Card; msg: string }[] = [];
    cards.forEach(c => {
      const u = c.credit_limit > 0 ? (c.used_amount / c.credit_limit) * 100 : 0;
      if (u > 70) a.push({ id: `high-${c.id}`, type: 'high', card: c, msg: `⚠️ ${c.name} está com ${u.toFixed(0)}% do limite utilizado.` });
      const d = daysUntilDue(c.due_day);
      if (d === 0) a.push({ id: `today-${c.id}`, type: 'today', card: c, msg: `🚨 HOJE é o vencimento do ${c.name}!` });
      else if (d <= 3 && d > 0) a.push({ id: `soon-${c.id}`, type: 'soon', card: c, msg: `⏰ Fatura do ${c.name} vence em ${d} dia(s).` });
    });
    return a.filter(al => !dismissedAlerts.includes(al.id));
  }, [cards, dismissedAlerts]);

  const dismissAlert = (id: string) => {
    const n = [...dismissedAlerts, id];
    setDismissedAlerts(n);
    sessionStorage.setItem('card_alerts_dismissed', JSON.stringify(n));
  };

  const resetForm = () => {
    setFName(''); setFNetwork('visa'); setFLastFour(''); setFLimit('');
    setFClosing(''); setFDue(''); setFUsed(''); setFColor('#7C3AED');
  };

  const handleSaveCard = async () => {
    if (!user || !fName || !fLimit) return;
    setSubmitting(true);
    const data = {
      user_id: user.id, name: fName, network: fNetwork,
      last_four: fLastFour || null, credit_limit: parseFloat(fLimit),
      closing_day: fClosing ? parseInt(fClosing) : null,
      due_day: fDue ? parseInt(fDue) : null,
      used_amount: fUsed ? parseFloat(fUsed) : 0,
      color: fColor, notes: null,
    };
    if (editCard) {
      const { error } = await supabase.from('credit_cards').update(data).eq('id', editCard.id);
      if (error) { toast.error('Erro ao atualizar'); setSubmitting(false); return; }
      toast.success('Cartão atualizado!');
    } else {
      const { error } = await supabase.from('credit_cards').insert(data);
      if (error) { toast.error('Erro ao cadastrar'); setSubmitting(false); return; }
      toast.success('Cartão cadastrado!');
    }
    setSubmitting(false); setEditCard(null); setShowForm(false); resetForm(); fetchData();
  };

  const handleDeleteCard = async (id: string) => {
    await supabase.from('card_bills').delete().eq('card_id', id);
    await supabase.from('credit_cards').delete().eq('id', id);
    toast.success('Cartão excluído');
    fetchData();
  };

  const handleEditCard = (c: Card) => {
    setEditCard(c); setFName(c.name); setFNetwork(c.network || 'visa');
    setFLastFour(c.last_four || ''); setFLimit(String(c.credit_limit));
    setFClosing(c.closing_day ? String(c.closing_day) : '');
    setFDue(c.due_day ? String(c.due_day) : '');
    setFUsed(String(c.used_amount)); setFColor(c.color || '#7C3AED');
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleInlineUsedSave = async (cardId: string) => {
    const val = parseFloat(editUsedVal);
    if (isNaN(val)) { setEditingUsed(null); return; }
    await supabase.from('credit_cards').update({ used_amount: val }).eq('id', cardId);
    setEditingUsed(null);
    fetchData();
  };

  const handlePayBill = async () => {
    if (!user || !payBillCard) return;
    const amount = payOption === 'total' ? payBillCard.used_amount
      : payOption === 'minimum' ? payBillCard.used_amount * 0.1
      : parseFloat(payCustom) || 0;
    // Upsert bill record
    const my = getMonthYear();
    await supabase.from('card_bills').upsert({
      user_id: user.id, card_id: payBillCard.id, month_year: my,
      total_amount: payBillCard.used_amount, paid: true, paid_at: new Date().toISOString(),
    }, { onConflict: 'card_id,month_year' });
    // Reset used if paying total
    if (payOption === 'total') {
      await supabase.from('credit_cards').update({ used_amount: 0 }).eq('id', payBillCard.id);
    }
    toast.success(`✓ Fatura de ${fmt(amount)} paga!`);
    setPayBillCard(null); fetchData();
  };

  const scrollToForm = () => {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const livePreview: Partial<Card> = { name: fName, network: fNetwork, last_four: fLastFour, credit_limit: parseFloat(fLimit) || 0, used_amount: parseFloat(fUsed) || 0, due_day: fDue ? parseInt(fDue) : null, color: fColor };

  // Chart data
  const pieData = cards.map(c => ({ name: c.name, value: c.used_amount, color: c.color })).filter(d => d.value > 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  // ─── EMPTY STATE ───
  if (!cards.length) return (
    <div className="flex flex-col items-center gap-4 py-16 px-4 pb-4 text-center">
      {/* CSS card stack */}
      <div className="relative w-[200px] h-[120px] mb-2">
        {[{ rot: -8, bg: '#cbd5e1', z: 1 }, { rot: -3, bg: '#94a3b8', z: 2 }, { rot: 0, bg: '#7C3AED', z: 3 }].map((c, i) => (
          <div key={i} className="absolute inset-0 rounded-xl" style={{ background: c.bg, transform: `rotate(${c.rot}deg)`, zIndex: c.z, width: 160, height: 96, left: 20, top: 12 }} />
        ))}
      </div>
      <h2 className="text-[18px] font-extrabold text-foreground">Nenhum cartão cadastrado</h2>
      <p className="text-[14px] text-muted-foreground max-w-[340px] leading-relaxed">
        Cadastre seus cartões de crédito para controlar limites, faturas e vencimentos em um só lugar.
      </p>
      <div className="flex gap-5 text-[13px] font-semibold text-muted-foreground">
        <span>✓ Controle de limite</span><span>✓ Alertas de vencimento</span><span>✓ Histórico de faturas</span>
      </div>
      <button onClick={scrollToForm}
        className="bg-[#7C3AED] text-white font-extrabold text-[14px] px-6 py-3 rounded-[10px] hover:bg-[#1A0D35] transition-colors mt-2">
        + Cadastrar meu primeiro cartão
      </button>
      {/* Form still available below */}
      <div ref={formRef} className="w-full max-w-[700px] mt-6">
        <AnimatePresence>{showForm && <CardForm />}</AnimatePresence>
      </div>
    </div>
  );

  function CardForm() {
    return (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden bg-card border-[1.5px] border-border rounded-2xl">
        <div className="p-5">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 space-y-3">
              <FormField label="Nome do cartão" value={fName} onChange={setFName} placeholder="Ex: Nubank Roxo" />
              {/* Network selector */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Bandeira</p>
                <div className="flex gap-2 flex-wrap">
                  {NETWORKS.map(n => (
                    <button key={n.val} onClick={() => setFNetwork(n.val)}
                      className={`w-[70px] py-2 rounded-lg border-[1.5px] text-[12px] font-bold text-center transition-all ${
                        fNetwork === n.val ? 'border-[#7C3AED] bg-secondary text-[#7C3AED]' : 'border-border text-muted-foreground hover:border-[#d4edda]'
                      }`}>{n.label}</button>
                  ))}
                </div>
              </div>
              <FormField label="Últimos 4 dígitos" value={fLastFour} onChange={v => setFLastFour(v.slice(0, 4))} placeholder="1234" helper="Opcional — para identificação" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Limite do cartão" value={fLimit} onChange={setFLimit} placeholder="0,00" type="number" prefix="R$" />
                <FormField label="Gasto atual" value={fUsed} onChange={setFUsed} placeholder="0,00" type="number" prefix="R$" helper="Quanto já gastou este mês" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dia de fechamento" value={fClosing} onChange={setFClosing} placeholder="1-31" type="number" helper="Dia que a fatura fecha" />
                <FormField label="Dia de vencimento" value={fDue} onChange={setFDue} placeholder="1-31" type="number" helper="Dia que você paga" />
              </div>
              {/* Colors */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Cor do cartão</p>
                <div className="flex gap-2">
                  {CARD_COLORS.map(c => (
                    <button key={c} onClick={() => setFColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${fColor === c ? 'border-[#1A0D35] scale-110' : 'border-transparent'}`}
                      style={{ background: c }}>
                      {fColor === c && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveCard} disabled={submitting || !fName || !fLimit}
                  className="bg-[#7C3AED] text-white font-extrabold text-[13px] px-5 py-2.5 rounded-[9px] hover:bg-[#1A0D35] disabled:opacity-50 transition-all">
                  {submitting ? 'Salvando...' : editCard ? 'Salvar alterações' : 'Salvar Cartão'}
                </button>
                <button onClick={() => { setShowForm(false); setEditCard(null); resetForm(); }}
                  className="text-[13px] font-semibold text-muted-foreground hover:text-[#dc2626] transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
            {/* Live preview */}
            <div className="flex-shrink-0 flex items-start justify-center pt-2">
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                <VisualCard card={livePreview} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ═══ ALERTS ═══ */}
      {alerts.map(al => (
        <div key={al.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-r-[10px] border-[1px] ${
          al.type === 'today' ? 'bg-[#fee2e2] border-[#fecaca] border-l-4 border-l-[#dc2626]' :
          al.type === 'high' ? 'bg-[#fef2f2] border-[#fecaca] border-l-4 border-l-[#dc2626]' :
          'bg-[#fffbeb] border-[#fde68a] border-l-4 border-l-[#d97706]'
        }`}>
          {al.type === 'today' || al.type === 'high' ? <AlertTriangle className="w-4 h-4 text-[#dc2626] flex-shrink-0" /> : <Clock className="w-4 h-4 text-[#d97706] flex-shrink-0" />}
          <span className="text-[13px] text-foreground font-medium flex-1">{al.msg}</span>
          <button onClick={() => dismissAlert(al.id)} className="text-muted-foreground hover:text-[#dc2626]"><X className="w-4 h-4" /></button>
        </div>
      ))}

      {/* ═══ 1. STATS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: CreditCard, bg: '#F5F3FF', ic: '#7C3AED', label: 'Limite Total', value: fmt(totalLimit), sub: `em ${cards.length} cartões`, color: '#7C3AED' },
          { icon: TrendingUp, bg: '#fee2e2', ic: '#dc2626', label: 'Total Utilizado', value: fmt(totalUsed), sub: `${utilPct.toFixed(0)}% do limite`, color: utilPct > 50 ? '#dc2626' : utilPct > 30 ? '#d97706' : '#7C3AED' },
          { icon: Wallet, bg: '#eff6ff', ic: '#2563eb', label: 'Disponível', value: fmt(totalAvailable), sub: 'crédito disponível', color: '#2563eb' },
          { icon: Calendar, bg: '#fffbeb', ic: '#d97706', label: 'Próximo Vencimento',
            value: nearestDue ? (nearestDue.days === 0 ? 'Hoje!' : nearestDue.days === 1 ? 'Amanhã' : `Em ${nearestDue.days} dias`) : '-',
            sub: nearestDue ? (nearestDue.card as Card).name : '-',
            color: nearestDue && nearestDue.days <= 1 ? '#dc2626' : nearestDue && nearestDue.days <= 3 ? '#d97706' : '#2563eb' },
        ].map((c, i) => (
          <div key={i} className={`bg-card border-[1.5px] border-border rounded-xl p-4 flex items-center gap-3.5 hover:border-[#C4B5FD] transition-colors ${
            i === 3 && nearestDue && nearestDue.days <= 3 ? 'border-[#d97706]' : ''
          }`}>
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

      {/* ═══ 2. CARDS GALLERY ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-black text-foreground">Meus Cartões</h3>
          <button onClick={scrollToForm} className="text-[12px] font-bold text-[#7C3AED] hover:underline">+ Adicionar cartão</button>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
          {cards.map(c => (
            <VisualCard key={c.id} card={c} onClick={() => handleEditCard(c)} onDelete={() => handleDeleteCard(c.id)} />
          ))}
          {/* Add placeholder */}
          <div onClick={scrollToForm}
            className="flex-shrink-0 w-[300px] h-[178px] rounded-[18px] border-2 border-dashed border-[#d4edda] bg-card flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-secondary hover:border-[#7C3AED] transition-all">
            <PlusCircle className="w-8 h-8 text-[#C4B5FD]" />
            <span className="text-[13px] text-[#7C3AED] font-bold">Adicionar cartão</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. ADD/EDIT FORM ═══ */}
      <div ref={formRef}>
        {!showForm ? (
          <button onClick={() => { resetForm(); setEditCard(null); setShowForm(true); }}
            className="w-full bg-card border-[1.5px] border-border rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-[14px] font-extrabold text-foreground">{editCard ? 'Editar Cartão' : '+ Novo Cartão'}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        ) : (
          <CardForm />
        )}
      </div>

      {/* ═══ 4. DETAIL TABLE ═══ */}
      <div className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="text-[15px] font-black text-foreground">Detalhes dos Cartões</h3>
        </div>
        {/* Header */}
        <div className="hidden md:grid grid-cols-8 gap-2 px-5 py-2.5 bg-background text-[10px] uppercase font-bold text-muted-foreground tracking-wide border-b border-border/50">
          <span>Cartão</span><span>Limite</span><span>Utilizado</span><span>Disponível</span>
          <span>Utilização</span><span>Vencimento</span><span>Fatura</span><span>Ações</span>
        </div>
        {cards.map(c => {
          const u = c.credit_limit > 0 ? (c.used_amount / c.credit_limit) * 100 : 0;
          const uColor = u < 30 ? '#7C3AED' : u < 70 ? '#d97706' : '#dc2626';
          const days = daysUntilDue(c.due_day);
          return (
            <div key={c.id} className="grid grid-cols-2 md:grid-cols-8 gap-2 px-5 py-3.5 border-b border-border/30 items-center hover:bg-accent/50 transition-colors"
              style={{ borderLeft: `4px solid ${c.color}` }}>
              {/* Card name */}
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="text-[13px] font-bold text-foreground truncate">{c.name}</span>
                <span className="text-[9px] font-bold text-muted-foreground bg-muted/30 px-1.5 py-[1px] rounded hidden md:inline">{c.network?.toUpperCase()}</span>
              </div>
              {/* Limit */}
              <span className="text-[13px] font-bold text-foreground">{fmt(c.credit_limit)}</span>
              {/* Used - inline editable */}
              <div className="flex items-center gap-1 group">
                {editingUsed === c.id ? (
                  <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={editUsedVal} onChange={e => setEditUsedVal(e.target.value)}
                    onBlur={() => handleInlineUsedSave(c.id)} onKeyDown={e => e.key === 'Enter' && handleInlineUsedSave(c.id)}
                    className="w-24 h-7 border border-[#7C3AED] rounded px-2 text-[13px] font-bold outline-none" autoFocus />
                ) : (
                  <>
                    <span className="text-[13px] font-bold" style={{ color: uColor }}>{fmt(c.used_amount)}</span>
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                      onClick={() => { setEditingUsed(c.id); setEditUsedVal(String(c.used_amount)); }} />
                  </>
                )}
              </div>
              {/* Available */}
              <span className="text-[13px] font-bold text-[#7C3AED] hidden md:block">{fmt(c.credit_limit - c.used_amount)}</span>
              {/* Utilization bar */}
              <div className="hidden md:block">
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(u, 100)}%`, background: uColor }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: uColor }}>{u.toFixed(0)}%</span>
              </div>
              {/* Due */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[12px] text-muted-foreground">Dia {c.due_day || '-'}</span>
                {c.due_day && (
                  <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded ${
                    days === 0 ? 'bg-[#fee2e2] text-[#dc2626]' : days <= 3 ? 'bg-[#fef2f2] text-[#dc2626]' : days <= 7 ? 'bg-[#fffbeb] text-[#d97706]' : 'bg-muted/30 text-muted-foreground'
                  }`}>{days === 0 ? 'HOJE!' : days === 1 ? 'AMANHÃ' : `${days}d`}</span>
                )}
              </div>
              {/* Bill */}
              <span className="text-[13px] font-bold text-foreground hidden md:block">{fmt(c.used_amount)}</span>
              {/* Actions */}
              <div className="flex items-center gap-1.5 justify-end md:justify-start">
                <button onClick={() => { setPayBillCard(c); setPayOption('total'); setPayCustom(''); setPayDate(new Date().toISOString().split('T')[0]); }}
                  className="text-[11px] font-bold text-[#5B21B6] bg-secondary border border-[#d4edda] px-2.5 py-1 rounded-[7px] hover:bg-[#EDE9FE] transition-colors">
                  Pagar
                </button>
                <button onClick={() => handleEditCard(c)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => handleDeleteCard(c.id)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#fef2f2] transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-[#dc2626]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ 5. BILL TRACKING ═══ */}
      <div className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-[15px] font-black text-foreground">Faturas</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setBillMonth(getMonthYear(parseInt(billMonth.split('-')[1]) - 1 - new Date().getMonth() - 1))}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary border border-border">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-[13px] font-bold text-foreground min-w-[100px] text-center">{fmtMonth(billMonth)}</span>
            <button onClick={() => setBillMonth(getMonthYear(parseInt(billMonth.split('-')[1]) - new Date().getMonth()))}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary border border-border">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {cards.map(c => {
          const bill = bills.find(b => b.card_id === c.id && b.month_year === billMonth);
          const amount = bill ? bill.total_amount : c.used_amount;
          return (
            <div key={c.id} className="px-5 py-4 border-b border-border/30 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 min-w-[160px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <div>
                  <p className="text-[14px] font-bold text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">Fecha dia {c.closing_day || '-'} · Vence dia {c.due_day || '-'}</p>
                </div>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[18px] font-black" style={{ color: amount > 0 ? c.color : '#94a3b8' }}>
                  {amount > 0 ? fmt(amount) : 'Sem gastos'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bill?.paid ? (
                  <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-2.5 py-1 rounded-md">✓ Paga</span>
                ) : (
                  <>
                    <span className="text-[11px] font-bold text-[#d97706] bg-[#fffbeb] px-2.5 py-1 rounded-md">Em aberto</span>
                    {amount > 0 && (
                      <button onClick={() => { setPayBillCard(c); setPayOption('total'); }}
                        className="text-[11px] font-bold text-[#5B21B6] bg-secondary border border-[#d4edda] px-2.5 py-1 rounded-[7px] hover:bg-[#EDE9FE] transition-colors">
                        Pagar {fmt(amount)}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {/* Summary */}
        <div className="px-5 py-3 bg-background flex items-center justify-between text-[12px] text-muted-foreground font-semibold">
          <span>Total de faturas em {fmtMonth(billMonth)}: {fmt(cards.reduce((s, c) => {
            const bill = bills.find(b => b.card_id === c.id && b.month_year === billMonth);
            return s + (bill ? bill.total_amount : c.used_amount);
          }, 0))}</span>
        </div>
      </div>

      {/* ═══ 6. CHARTS ═══ */}
      {pieData.length > 0 && (
        <div className="bg-card border-[1.5px] border-border rounded-2xl p-6">
          <h3 className="text-[15px] font-black text-foreground mb-4">Gastos por Cartão</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="font-semibold text-foreground">{d.name}</span>
                    <span className="text-muted-foreground">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cards.map(c => ({ name: c.name, used: c.used_amount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="used" radius={[6, 6, 0, 0]}>
                    {cards.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAY BILL MODAL ═══ */}
      <AnimatePresence>
        {payBillCard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setPayBillCard(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setPayBillCard(null)}>
              <div className="bg-card rounded-[20px] p-7 w-full max-w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[17px] font-black text-foreground">Pagar Fatura</h3>
                  <button onClick={() => setPayBillCard(null)} className="text-muted-foreground hover:text-[#dc2626]"><X className="w-5 h-5" /></button>
                </div>
                {/* Mini card */}
                <div className="flex justify-center mb-4" style={{ transform: 'scale(0.6)', transformOrigin: 'top center' }}>
                  <VisualCard card={payBillCard} />
                </div>
                {/* Bill summary */}
                <div className="bg-background rounded-[10px] p-3.5 mb-4">
                  <p className="text-[12px] text-muted-foreground">Fatura de {fmtMonth(getMonthYear())}:</p>
                  <p className="text-[20px] font-black" style={{ color: payBillCard.color }}>{fmt(payBillCard.used_amount)}</p>
                </div>
                {/* Payment options */}
                <div className="space-y-2 mb-4">
                  {[
                    { key: 'total' as const, label: `Valor total — ${fmt(payBillCard.used_amount)}`, rec: true },
                    { key: 'minimum' as const, label: `Valor mínimo — ${fmt(payBillCard.used_amount * 0.1)}`, rec: false },
                    { key: 'custom' as const, label: 'Outro valor', rec: false },
                  ].map(o => (
                    <button key={o.key} onClick={() => setPayOption(o.key)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-[1.5px] transition-all ${
                        payOption === o.key ? (o.rec ? 'border-[#7C3AED] bg-secondary' : 'border-[#d97706] bg-[#fffbeb]') : 'border-border hover:border-[#d4edda]'
                      }`}>
                      <span className="text-[13px] font-bold text-foreground">{o.label}</span>
                      {o.rec && <span className="ml-2 text-[10px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-[1px] rounded">Recomendado</span>}
                    </button>
                  ))}
                </div>
                {payOption === 'minimum' && (
                  <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-2.5 mb-4 text-[12px] text-[#92400e]">
                    ⚠️ Pagar apenas o mínimo gera juros altos (até 20%/mês). Tente pagar o valor total sempre que possível.
                  </div>
                )}
                {payOption === 'custom' && (
                  <div className="mb-4">
                    <FormField label="Valor" value={payCustom} onChange={setPayCustom} placeholder="0,00" type="number" prefix="R$" />
                  </div>
                )}
                <div className="mb-4">
                  <FormField label="Data do pagamento" value={payDate} onChange={setPayDate} type="date" />
                </div>
                <button onClick={handlePayBill}
                  className="w-full bg-[#7C3AED] text-white font-extrabold text-[14px] py-3 rounded-xl hover:bg-[#1A0D35] transition-all">
                  Confirmar pagamento
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

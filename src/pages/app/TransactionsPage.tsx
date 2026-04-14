import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, PLAN_LIMITS, PlanType } from '@/lib/plans';
import { getCategories } from '@/lib/objectives';
import {
  TrendingUp, TrendingDown, Scale, Receipt, PlusCircle, ArrowUp, ArrowDown,
  Search, X, ChevronDown, ChevronLeft, ChevronRight, Trash2, Pencil, Download,
  Upload, ReceiptText, Plus, NotepadText, Check
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string; origin: string; category: string; notes: string | null;
  user_id: string; created_at: string | null;
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const { profile, config } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const limits = PLAN_LIMITS[plan];
  const profileType = config?.profile_type || 'personal';

  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [origin, setOrigin] = useState<'business' | 'personal'>(profileType === 'personal' ? 'personal' : 'business');
  const [cat, setCat] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFreq, setRecurFreq] = useState('month');
  const [submitting, setSubmitting] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'business' | 'personal'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'az'>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Table state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Category breakdown
  const [showCatBreakdown, setShowCatBreakdown] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);

  const descRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cats = useMemo(() => getCategories(profileType, type), [profileType, type]);
  const flatCats = useMemo(() => {
    if (Array.isArray(cats) && typeof cats[0] === 'string') return cats as string[];
    return (cats as { group: string; items: string[] }[]).flatMap(g => g.items);
  }, [cats]);

  const fetchTxs = useCallback(async () => {
    if (!user) return;
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false });
    setTxs((data || []) as Tx[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let r = txs
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => filterOrigin === 'all' || t.origin === filterOrigin)
      .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
    switch (sortBy) {
      case 'oldest': r = [...r].sort((a, b) => a.date.localeCompare(b.date)); break;
      case 'highest': r = [...r].sort((a, b) => Number(b.amount) - Number(a.amount)); break;
      case 'lowest': r = [...r].sort((a, b) => Number(a.amount) - Number(b.amount)); break;
      case 'az': r = [...r].sort((a, b) => a.description.localeCompare(b.description)); break;
      default: r = [...r].sort((a, b) => b.date.localeCompare(a.date));
    }
    return r;
  }, [txs, filterType, filterOrigin, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const incCount = filtered.filter(t => t.type === 'income').length;
    const expCount = filtered.filter(t => t.type === 'expense').length;
    return { inc, exp, net: inc - exp, incCount, expCount, total: filtered.length };
  }, [filtered]);

  // Category breakdown data
  const catBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; type: string }> = {};
    filtered.forEach(t => {
      if (!map[t.category]) map[t.category] = { amount: 0, type: t.type };
      map[t.category].amount += Number(t.amount);
    });
    return Object.entries(map)
      .map(([name, { amount, type: tp }]) => ({ name, amount, type: tp }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const handleAdd = async () => {
    const v = parseFloat(val);
    if (!date || !desc.trim() || isNaN(v) || v <= 0 || !cat) { toast.error('Preencha todos os campos'); return; }
    if (limits.transactions_per_month !== Infinity && txs.length >= limits.transactions_per_month) {
      toast.error(`Limite de ${limits.transactions_per_month} lançamentos atingido. Faça upgrade!`); return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: user!.id, date, description: desc.trim(), amount: v, type, origin, category: cat,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 1500);
    setDesc(''); setVal(''); setCat(''); setNotes(''); setShowNotes(false);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    fetchTxs();
    setTimeout(() => descRef.current?.focus(), 100);
  };

  const handleRemove = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    toast.success('Removido');
    setDeletingId(null);
    fetchTxs();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    for (const id of ids) {
      await supabase.from('transactions').delete().eq('id', id);
    }
    toast.success(`${ids.length} lançamento(s) removido(s)`);
    setSelected(new Set());
    fetchTxs();
  };

  const handleInlineEdit = async (id: string) => {
    if (!editDesc.trim()) { setEditingId(null); return; }
    await supabase.from('transactions').update({ description: editDesc.trim() }).eq('id', id);
    setEditingId(null);
    fetchTxs();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(t => t.id)));
  };

  const clearFilters = () => {
    setFilterType('all'); setFilterOrigin('all'); setSearch(''); setSortBy('newest');
  };
  const hasActiveFilters = filterType !== 'all' || filterOrigin !== 'all' || search || sortBy !== 'newest';

  const scrollToForm = (t: 'income' | 'expense') => {
    setType(t); setCat('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => descRef.current?.focus(), 300);
  };




  const renderCategorySelect = () => {
    if (Array.isArray(cats) && typeof cats[0] === 'string') {
      return (
        <div className="relative">
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="w-full h-[42px] px-3 pr-8 text-[13px] font-semibold rounded-[9px] border-[1.5px] border-border bg-card appearance-none focus:border-[#16a34a] focus:outline-none transition-colors">
            <option value="">Selecione...</option>
            {(cats as string[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      );
    }
    return (
      <div className="relative">
        <select value={cat} onChange={e => setCat(e.target.value)}
          className="w-full h-[42px] px-3 pr-8 text-[13px] font-semibold rounded-[9px] border-[1.5px] border-border bg-card appearance-none focus:border-[#16a34a] focus:outline-none transition-colors">
          <option value="">Selecione...</option>
          {(cats as { group: string; items: string[] }[]).map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    );
  };

  const sortLabels: Record<string, string> = {
    newest: 'Mais recente', oldest: 'Mais antigo', highest: 'Maior valor', lowest: 'Menor valor', az: 'A → Z',
  };

  if (loading) return <div className="p-7"><div className="h-96 rounded-2xl bg-white/60 animate-pulse" /></div>;

  const limitPct = limits.transactions_per_month !== Infinity ? (txs.length / limits.transactions_per_month) * 100 : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="px-4 py-5 md:p-7 flex flex-col gap-4 md:gap-5 max-w-[1400px] mx-auto">

        {/* ── 1. STATS STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
          {[
            { label: 'Receitas', value: totals.inc, color: '#16a34a', bg: '#dcfce7', icon: TrendingUp, sub: `${totals.incCount} receitas`, valColor: '#16a34a' },
            { label: 'Despesas', value: totals.exp, color: '#dc2626', bg: '#fee2e2', icon: TrendingDown, sub: `${totals.expCount} despesas`, valColor: '#dc2626' },
            { label: 'Saldo', value: totals.net, color: '#2563eb', bg: '#eff6ff', icon: Scale, sub: 'Resultado líquido', valColor: totals.net >= 0 ? '#16a34a' : '#dc2626' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 md:gap-3.5 bg-card border-[1.5px] border-border rounded-xl p-3 md:p-4 hover:border-[#86efac] transition-colors duration-200">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <s.icon className="w-4 h-4 md:w-[18px] md:h-[18px]" style={{ color: s.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wide truncate">{s.label}</p>
                <p className="text-sm md:text-[20px] font-black truncate" style={{ color: s.valColor }}>{formatCurrency(s.value)}</p>
                <p className="text-[10px] md:text-[11px] text-muted-foreground hidden md:block">{s.sub}</p>
              </div>
            </div>
          ))}
          {/* Card 4: count */}
          <div className="flex items-center gap-2.5 md:gap-3.5 bg-card border-[1.5px] border-border rounded-xl p-3 md:p-4 hover:border-[#86efac] transition-colors duration-200">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-muted/30">
              <Receipt className="w-4 h-4 md:w-[18px] md:h-[18px] text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Lançamentos</p>
              <p className="text-sm md:text-[20px] font-black text-foreground">{txs.length}</p>
              {limits.transactions_per_month !== Infinity ? (
                <div>
                  <p className="text-[10px] md:text-[11px] text-muted-foreground">{txs.length}/{limits.transactions_per_month}</p>
                  <div className="mt-1 h-[3px] rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${Math.min(limitPct, 100)}%`,
                      background: limitPct > 90 ? '#dc2626' : limitPct > 80 ? '#f59e0b' : '#16a34a'
                    }} />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] md:text-[11px] text-[#16a34a] font-semibold">Ilimitados ✓</p>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. ADD TRANSACTION CARD ── */}
        <div ref={formRef} className="bg-card border-[1.5px] border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className={`flex flex-col md:flex-row md:items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border/50 transition-colors duration-200 gap-2.5 ${type === 'income' ? 'bg-secondary' : 'bg-[#fef2f2]'}`}>
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4 text-[#16a34a]" />
              <span className="text-sm font-extrabold text-foreground">Novo Lançamento</span>
              <button onClick={() => setShowImport(true)} className="ml-auto md:ml-2 flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border-[1.5px] border-border rounded-[7px] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                <Upload className="w-3 h-3" /> Importar
              </button>
            </div>
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setCat(''); }}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 md:py-[7px] rounded-lg text-[13px] font-extrabold border-2 transition-all duration-200 cursor-pointer ${
                    type === t
                      ? t === 'income' ? 'bg-[#dcfce7] text-[#166534] border-[#16a34a]' : 'bg-[#fee2e2] text-[#991b1b] border-[#dc2626]'
                      : 'bg-background text-muted-foreground border-border'
                  }`}>
                  {t === 'income' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                  {t === 'income' ? 'Receita' : 'Despesa'}
                </button>
              ))}
            </div>
          </div>

          {/* Form body */}
          <div className="p-4 md:p-5" onKeyDown={e => { if (e.key === 'Enter' && !submitting) handleAdd(); }}>
            {/* Row 1: Date + Description */}
            <div className="grid grid-cols-5 md:grid-cols-3 gap-2.5 md:gap-3 mb-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full h-[42px] px-2 md:px-3 text-[13px] font-semibold rounded-[9px] border-[1.5px] border-border focus:border-[#16a34a] focus:outline-none transition-colors" />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Descrição</label>
                <input ref={descRef} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Supermercado Extra"
                  className="w-full h-[42px] px-3 text-[13px] font-semibold rounded-[9px] border-[1.5px] border-border focus:border-[#16a34a] focus:outline-none transition-colors" />
              </div>
            </div>

            {/* Row 2: Value + Origin (mobile: 2 cols) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Valor</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted-foreground">R$</span>
                  <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={val} onChange={e => setVal(e.target.value)} placeholder="0,00"
                    className="w-full h-[42px] pl-[28px] pr-2 text-[13px] font-semibold rounded-[9px] border-[1.5px] border-border focus:border-[#16a34a] focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Origem</label>
                <div className="flex gap-1">
                  {(['personal', 'business'] as const).map(o => (
                    <button key={o} onClick={() => setOrigin(o)}
                      className={`flex-1 px-1.5 py-2 rounded-lg text-[11px] md:text-[12px] font-bold border-[1.5px] transition-all duration-200 ${
                        origin === o
                          ? o === 'personal' ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]' : 'bg-secondary text-[#166534] border-[#d4edda]'
                          : 'bg-card text-muted-foreground border-border'
                      }`}>
                      {o === 'personal' ? '🏠 Pessoal' : '💼 Negócio'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Categoria</label>
                {renderCategorySelect()}
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Recorrente?</label>
                <div className="flex items-center gap-2 h-[42px]">
                  <button onClick={() => setIsRecurring(!isRecurring)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${isRecurring ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform duration-200 ${isRecurring ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                  <AnimatePresence>
                    {isRecurring && (
                      <motion.select initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                        value={recurFreq} onChange={e => setRecurFreq(e.target.value)}
                        className="h-8 px-2 text-[12px] font-semibold rounded-lg border-[1.5px] border-border focus:outline-none">
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                        <option value="year">Ano</option>
                      </motion.select>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Notes */}
            <AnimatePresence>
              {!showNotes ? (
                <button onClick={() => setShowNotes(true)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#16a34a] transition-colors mb-3">
                  <Plus className="w-3 h-3" /> Adicionar nota
                </button>
              ) : (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Observações opcionais..."
                    className="w-full px-3 py-2 text-[13px] rounded-[9px] border-[1.5px] border-border focus:border-[#16a34a] focus:outline-none resize-none transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom row */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground hidden md:block">Pressione Enter ↵ para adicionar</span>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={() => { setDesc(''); setVal(''); setCat(''); setNotes(''); setShowNotes(false); }}
                  className="text-[12px] text-muted-foreground hover:text-[#dc2626] transition-colors">Limpar</button>
                <button onClick={handleAdd} disabled={submitting}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[9px] text-[13px] font-extrabold text-white transition-all duration-200 active:scale-[0.97] ${
                    successFlash ? 'bg-[#16a34a]' : 'bg-[#16a34a] hover:bg-[#14532d]'
                  } disabled:opacity-50`}>
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : successFlash ? (
                    <><Check className="w-4 h-4" /> Adicionado!</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /> Adicionar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. FILTER BAR ── */}
        <div className="bg-card border-[1.5px] border-border rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {([['all', 'Todos'], ['income', 'Receitas'], ['expense', 'Despesas']] as const).map(([v, l]) => (
              <button key={v} onClick={() => { setFilterType(v); setPage(1); }}
                className={`px-2.5 md:px-3.5 py-1.5 rounded-full text-[11px] md:text-[12px] font-bold border-[1.5px] transition-all duration-200 ${
                  filterType === v
                    ? v === 'income' ? 'bg-[#dcfce7] border-[#16a34a] text-[#166534]' : v === 'expense' ? 'bg-[#fee2e2] border-[#dc2626] text-[#991b1b]' : 'bg-secondary border-[#d4edda] text-[#166534]'
                    : 'bg-card border-border text-muted-foreground'
                }`}>{l}</button>
            ))}
            <div className="w-px h-4 bg-muted/30 hidden md:block" />
            {([['all', 'Tudo'], ['personal', 'Pessoal'], ['business', 'Negócio']] as const).map(([v, l]) => (
              <button key={v} onClick={() => { setFilterOrigin(v as any); setPage(1); }}
                className={`px-2.5 md:px-3.5 py-1.5 rounded-full text-[11px] md:text-[12px] font-bold border-[1.5px] transition-all duration-200 ${
                  filterOrigin === v ? 'bg-secondary border-[#d4edda] text-[#166534]' : 'bg-card border-border text-muted-foreground'
                }`}>{l}</button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar..."
                className="w-full md:w-[180px] h-9 pl-8 pr-8 text-[13px] rounded-[9px] border-[1.5px] border-border bg-background focus:bg-card focus:border-[#16a34a] focus:outline-none transition-colors" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#dc2626]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1 px-2.5 py-2 text-[11px] md:text-[12px] font-semibold text-muted-foreground hover:text-[#16a34a] transition-colors whitespace-nowrap">
                {sortLabels[sortBy]} <ChevronDown className="w-3 h-3" />
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                  {Object.entries(sortLabels).map(([k, l]) => (
                    <button key={k} onClick={() => { setSortBy(k as any); setShowSortDropdown(false); }}
                      className={`block w-full text-left px-3 py-1.5 text-[12px] hover:bg-secondary transition-colors ${sortBy === k ? 'font-bold text-[#16a34a]' : 'text-muted-foreground'}`}>{l}</button>
                  ))}
                </div>
              )}
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] font-semibold text-[#dc2626] hover:underline whitespace-nowrap">
                <X className="w-2.5 h-2.5" /> Limpar
              </button>
            )}
          </div>
        </div>

        {/* ── 4. CATEGORY BREAKDOWN ── */}
        {filtered.length > 0 && (
          <div>
            <button onClick={() => setShowCatBreakdown(!showCatBreakdown)}
              className="flex items-center gap-1 text-[12px] font-bold text-[#16a34a] mb-2 hover:underline">
              Ver resumo por categoria <ChevronDown className={`w-3 h-3 transition-transform ${showCatBreakdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showCatBreakdown && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="bg-card border-[1.5px] border-border rounded-xl p-4 md:p-5 overflow-hidden">
                  <p className="text-[13px] font-bold text-foreground mb-4">Gastos por categoria</p>
                  {catBreakdown.slice(0, 8).map((c, i) => {
                    const maxVal = catBreakdown[0]?.amount || 1;
                    return (
                      <div key={c.name} className="flex items-center gap-2 md:gap-2.5 mb-2.5">
                        <span className="text-[11px] md:text-[12px] font-semibold text-foreground min-w-[80px] md:min-w-[120px] truncate">{c.name}</span>
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(c.amount / maxVal) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className={`h-full rounded-full ${c.type === 'income' ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`} />
                        </div>
                        <span className={`text-[11px] md:text-[12px] font-bold min-w-[70px] md:min-w-[80px] text-right ${c.type === 'income' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                          {formatCurrency(c.amount)}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── 5. TRANSACTIONS LIST ── */}
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="bg-card border-[1.5px] border-border rounded-2xl flex flex-col items-center py-10 md:py-14 px-6 text-center gap-3.5">
            <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full bg-secondary flex items-center justify-center">
              <ReceiptText className="w-8 h-8 md:w-10 md:h-10 text-[#86efac]" />
            </div>
            <p className="text-[15px] md:text-[17px] font-extrabold text-foreground">Nenhum lançamento ainda</p>
            <p className="text-[13px] md:text-sm text-muted-foreground max-w-[320px] leading-relaxed">
              Adicione sua primeira receita ou despesa para começar.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button onClick={() => scrollToForm('income')}
                className="px-4 py-2.5 rounded-[9px] text-[12px] md:text-[13px] font-extrabold bg-[#dcfce7] text-[#166534] border-[1.5px] border-[#d4edda] hover:brightness-95 transition-all">
                + Receita
              </button>
              <button onClick={() => scrollToForm('expense')}
                className="px-4 py-2.5 rounded-[9px] text-[12px] md:text-[13px] font-extrabold bg-[#fee2e2] text-[#991b1b] border-[1.5px] border-[#fecaca] hover:brightness-95 transition-all">
                + Despesa
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border-[1.5px] border-border rounded-[14px] overflow-hidden">
            {/* Bulk bar */}
            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="bg-[#14532d] px-4 md:px-5 py-2.5 flex items-center gap-2 md:gap-3 text-white overflow-hidden flex-wrap">
                  <span className="text-[12px] md:text-[13px] font-semibold">{selected.size} selecionado(s)</span>
                  <button onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] md:text-[12px] font-semibold bg-white/15 border border-white/30 hover:bg-[#dc2626] transition-colors">
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                  <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] md:text-[12px] hover:underline">Cancelar</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-background border-b-[1.5px] border-border/50">
                    <th className="w-10 px-3 py-2.5">
                      <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-[1.5px] border-border accent-[#16a34a]" />
                    </th>
                    {['#', 'DATA', 'DESCRIÇÃO', 'CATEGORIA', 'ORIGEM', 'TIPO', 'VALOR', ''].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] uppercase font-bold text-muted-foreground tracking-[0.7px] ${h === 'VALOR' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginated.map((tx, i) => {
                      const isSelected = selected.has(tx.id);
                      const isDeleting = deletingId === tx.id;
                      return (
                        <motion.tr key={tx.id}
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`border-b border-border/30 group transition-colors hover:bg-accent/50 border-l-[3px] ${tx.type === 'income' ? 'border-l-[#16a34a]' : 'border-l-[#dc2626]'}`}>
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(tx.id)}
                              className="w-4 h-4 rounded border-[1.5px] border-border accent-[#16a34a]" />
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center w-[26px] h-[22px] bg-background border border-border rounded-md text-[11px] font-extrabold text-muted-foreground">
                              {(page - 1) * perPage + i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-muted-foreground font-medium whitespace-nowrap">
                            {format(parseISO(tx.date), 'dd MMM', { locale: ptBR })}
                          </td>
                          <td className="px-4 py-2.5">
                            {editingId === tx.id ? (
                              <input autoFocus value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                onBlur={() => handleInlineEdit(tx.id)} onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(tx.id); if (e.key === 'Escape') setEditingId(null); }}
                                className="w-full px-2 py-1 text-[13px] font-bold rounded border border-[#16a34a] focus:outline-none" />
                            ) : (
                              <span onClick={() => { setEditingId(tx.id); setEditDesc(tx.description); }}
                                className="text-[13px] font-bold text-foreground cursor-pointer hover:underline decoration-dotted inline-flex items-center gap-1.5">
                                {tx.description}
                                {tx.notes && <NotepadText className="w-3 h-3 text-muted-foreground" />}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                              tx.type === 'income' ? 'bg-[#dcfce7] text-[#166534] border-[#d4edda]' : 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
                            }`}>{tx.category}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.origin === 'business' ? 'bg-secondary text-[#166534] border border-[#d4edda]' : 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]'
                            }`}>{tx.origin === 'business' ? 'Negócio' : 'Pessoal'}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`flex items-center gap-1 text-[12px] font-bold ${tx.type === 'income' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                              {tx.type === 'income' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                              {tx.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right text-sm font-black tracking-tight ${tx.type === 'income' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                            {tx.type === 'expense' ? '−' : '+'}{formatCurrency(Number(tx.amount))}
                          </td>
                          <td className="px-4 py-2.5">
                            {isDeleting ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                <span className="text-[#dc2626]">Excluir?</span>
                                <button onClick={() => handleRemove(tx.id)} className="text-[#dc2626] hover:underline">Sim</button>
                                <button onClick={() => setDeletingId(null)} className="text-muted-foreground hover:underline">Não</button>
                              </div>
                            ) : (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button onClick={() => { setEditingId(tx.id); setEditDesc(tx.description); }}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-background border border-border hover:bg-secondary hover:text-[#16a34a] text-muted-foreground transition-colors">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => setDeletingId(tx.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-background border border-border hover:bg-[#fef2f2] hover:text-[#dc2626] text-muted-foreground transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border/30">
              {paginated.map((tx, i) => {
                const isDeleting = deletingId === tx.id;
                return (
                  <div key={tx.id} className={`px-4 py-3 border-l-[3px] ${tx.type === 'income' ? 'border-l-[#16a34a]' : 'border-l-[#dc2626]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-foreground truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{format(parseISO(tx.date), 'dd/MM/yy')}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.type === 'income' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
                          }`}>{tx.category}</span>
                          <span className={`text-[10px] font-semibold ${tx.origin === 'business' ? 'text-[#166534]' : 'text-[#1d4ed8]'}`}>
                            {tx.origin === 'business' ? 'Negócio' : 'Pessoal'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[14px] font-black ${tx.type === 'income' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                          {tx.type === 'expense' ? '−' : '+'}{formatCurrency(Number(tx.amount))}
                        </p>
                        {isDeleting ? (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold">
                            <button onClick={() => handleRemove(tx.id)} className="text-[#dc2626]">Excluir</button>
                            <button onClick={() => setDeletingId(null)} className="text-muted-foreground">Não</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(tx.id)} className="mt-1 text-muted-foreground">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / pagination */}
            <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-5 py-3 border-t-[1.5px] border-border/50 bg-background text-[12px] gap-2">
              <span className="text-muted-foreground text-[11px] md:text-[12px]">
                {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-[7px] bg-card border-[1.5px] border-border disabled:opacity-40 hover:bg-secondary hover:border-[#d4edda] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-[7px] text-[13px] font-semibold transition-colors ${
                        page === p ? 'bg-[#16a34a] text-white font-extrabold' : 'bg-card border-[1.5px] border-border text-muted-foreground hover:bg-secondary'
                      }`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-[7px] bg-card border-[1.5px] border-border disabled:opacity-40 hover:bg-secondary hover:border-[#d4edda] transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Por página:
                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="h-7 px-1.5 text-[11px] rounded border border-border focus:outline-none">
                  <option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── CSV IMPORT MODAL ── */}
        <AnimatePresence>
          {showImport && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center md:p-4" onClick={() => { setShowImport(false); setCsvData(null); }}>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-[600px] max-h-[85vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-border/50">
                  <h3 className="text-sm font-extrabold text-foreground">Importar Lançamentos</h3>
                  <button onClick={() => { setShowImport(false); setCsvData(null); }} className="text-muted-foreground hover:text-[#dc2626]"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 md:p-5">
                  {!csvData ? (
                    <div
                      className="border-2 border-dashed border-[#d4edda] rounded-xl p-8 md:p-10 text-center bg-background cursor-pointer hover:border-[#16a34a] transition-colors"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
                      onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.ofx'; inp.onchange = (e: any) => { if (e.target.files[0]) handleCsvFile(e.target.files[0]); }; inp.click(); }}>
                      <Upload className="w-10 h-10 text-[#16a34a] mx-auto mb-2" />
                      <p className="text-sm font-bold text-foreground">Arraste o CSV aqui</p>
                      <p className="text-[12px] text-muted-foreground">ou clique para selecionar</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-[11px]">
                          <thead><tr className="bg-background">{csvData[0]?.map((h, i) => <th key={i} className="px-3 py-2 text-left font-bold text-muted-foreground">{h}</th>)}</tr></thead>
                          <tbody>{csvData.slice(1, 6).map((r, i) => <tr key={i} className="border-t border-border/50">{r.map((c, j) => <td key={j} className="px-3 py-1.5 text-foreground">{c}</td>)}</tr>)}</tbody>
                        </table>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[['Data', 'date'], ['Descrição', 'desc'], ['Valor', 'val'], ['Tipo (opcional)', 'type']].map(([label, key]) => (
                          <div key={key}>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">{label}</label>
                            <select value={(csvMapping as any)[key]} onChange={e => setCsvMapping(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                              className="w-full h-9 px-2 text-[12px] rounded-lg border border-border focus:outline-none">
                              {key === 'type' && <option value={-1}>Auto-detectar</option>}
                              {csvData[0]?.map((h, i) => <option key={i} value={i}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      <p className="text-[12px] text-muted-foreground">{csvData.length - 1} lançamentos serão importados</p>
                      <button onClick={handleCsvImport}
                        className="w-full py-2.5 rounded-lg bg-[#16a34a] text-white font-extrabold text-[13px] hover:bg-[#14532d] transition-colors">
                        Confirmar importação
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
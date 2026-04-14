import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, PLAN_LIMITS, PlanType } from '@/lib/plans';
import { OBJECTIVES } from '@/lib/objectives';
import {
  Target, Trophy, TrendingUp, Star, PlusCircle, ChevronDown, X,
  MoreHorizontal, Pencil, DollarSign, Award, Trash2, Calendar, Clock, Check, Flame
} from 'lucide-react';
import { format, parseISO, differenceInDays, subDays, isSameDay, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const GOAL_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0f766e', '#db2777', '#ea580c'];

type SortMode = 'recent' | 'value' | 'deadline' | 'progress';

export default function GoalsPage() {
  const { user } = useAuth();
  const { profile, config } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const limits = PLAN_LIMITS[plan];

  const [goals, setGoals] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  // Form state
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [objectiveType, setObjectiveType] = useState('custom');
  const [goalColor, setGoalColor] = useState(GOAL_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editGoal, setEditGoal] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editCurrent, setEditCurrent] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editObjectiveType, setEditObjectiveType] = useState('custom');
  const [editColor, setEditColor] = useState(GOAL_COLORS[0]);

  // Dropdown
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setGoals(data || []);
    // Fetch checkins for last 7 days
    const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    const { data: cks } = await supabase.from('goal_checkins').select('*').eq('user_id', user.id).gte('date', weekAgo).order('date', { ascending: true });
    const grouped: Record<string, any[]> = {};
    (cks || []).forEach(ck => {
      if (!grouped[ck.goal_id]) grouped[ck.goal_id] = [];
      grouped[ck.goal_id].push(ck);
    });
    setCheckins(grouped);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const activeGoals = useMemo(() => goals.filter(g => Number(g.current_amount) < Number(g.target_amount)), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => Number(g.current_amount) >= Number(g.target_amount)), [goals]);

  const totalRemaining = useMemo(() => activeGoals.reduce((s, g) => s + Math.max(0, Number(g.target_amount) - Number(g.current_amount)), 0), [activeGoals]);
  const biggestGoal = useMemo(() => goals.length ? goals.reduce((a, b) => Number(a.target_amount) > Number(b.target_amount) ? a : b) : null, [goals]);

  const sortedActive = useMemo(() => {
    const arr = [...activeGoals];
    switch (sortMode) {
      case 'value': return arr.sort((a, b) => Number(b.target_amount) - Number(a.target_amount));
      case 'deadline': return arr.sort((a, b) => {
        if (!a.deadline) return 1; if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
      case 'progress': return arr.sort((a, b) => (Number(b.current_amount) / Number(b.target_amount)) - (Number(a.current_amount) / Number(a.target_amount)));
      default: return arr;
    }
  }, [activeGoals, sortMode]);

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#16a34a', '#22c55e', '#d97706', '#f59e0b', '#ffffff'] });
  };

  const handleAdd = async () => {
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    if (!name.trim() || isNaN(t) || t <= 0) { toast.error('Preencha nome e valor alvo'); return; }
    if (limits.goals !== Infinity && goals.length >= limits.goals) { toast.error('Limite de metas atingido. Faça upgrade!'); return; }
    setCreating(true);
    await supabase.from('goals').insert({
      user_id: user!.id, name: name.trim(), target_amount: t, current_amount: c,
      start_date: format(new Date(), 'yyyy-MM-dd'), deadline: deadline || null,
      objective_type: objectiveType, color: goalColor,
    });
    toast.success('Meta criada com sucesso!');
    setName(''); setTarget(''); setCurrent(''); setDeadline(''); setObjectiveType('custom'); setGoalColor(GOAL_COLORS[0]);
    setCreating(false);
    setFormOpen(false);
    if (c >= t) triggerConfetti();
    fetchGoals();
  };

  const handleQuickAdd = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newVal = Number(goal.current_amount) + amount;
    const today = format(new Date(), 'yyyy-MM-dd');
    // Update goal amount
    await supabase.from('goals').update({ current_amount: newVal }).eq('id', id);
    // Upsert daily checkin
    const existing = (checkins[id] || []).find(c => c.date === today);
    if (existing) {
      await supabase.from('goal_checkins').update({ amount: Number(existing.amount) + amount }).eq('id', existing.id);
    } else {
      await supabase.from('goal_checkins').insert({ user_id: user!.id, goal_id: id, date: today, amount });
    }
    // Save to goal_deposits history
    await supabase.from('goal_deposits').insert({
      user_id: user!.id, goal_id: id, amount, deposit_date: today,
    });
    toast.success(`✓ ${formatCurrency(amount)} adicionado!`);
    if (newVal >= Number(goal.target_amount) && Number(goal.current_amount) < Number(goal.target_amount)) {
      triggerConfetti();
      toast('🏆 Parabéns! Você atingiu sua meta!', { description: goal.name, duration: 3000 });
    }
    fetchGoals();
  };

  const handleCustomAdd = async (id: string, val: string) => {
    const amount = parseFloat(val);
    if (isNaN(amount) || amount <= 0) return;
    await handleQuickAdd(id, amount);
  };

  const handleCheckinToday = async (goalId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = (checkins[goalId] || []).find(c => c.date === today);
    if (existing) {
      // Already checked in today — uncheckin
      await supabase.from('goal_checkins').delete().eq('id', existing.id);
      toast('Check-in de hoje removido');
    } else {
      // Check in with 0 amount (just marking the day)
      await supabase.from('goal_checkins').insert({ user_id: user!.id, goal_id: goalId, date: today, amount: 0 });
      toast.success('✓ Dia marcado!');
    }
    fetchGoals();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    toast.success('Meta removida');
    setOpenMenu(null);
    fetchGoals();
  };

  const handleMarkComplete = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    await supabase.from('goals').update({ current_amount: Number(goal.target_amount) }).eq('id', id);
    triggerConfetti();
    toast('🏆 Parabéns! Meta concluída!', { description: goal.name, duration: 3000 });
    setOpenMenu(null);
    fetchGoals();
  };

  const openEditModal = (g: any) => {
    setEditGoal(g);
    setEditName(g.name);
    setEditTarget(String(g.target_amount));
    setEditCurrent(String(g.current_amount));
    setEditDeadline(g.deadline || '');
    setEditObjectiveType(g.objective_type || 'custom');
    setEditColor(g.color || GOAL_COLORS[0]);
    setOpenMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editGoal) return;
    const t = parseFloat(editTarget);
    if (!editName.trim() || isNaN(t) || t <= 0) { toast.error('Preencha os campos'); return; }
    await supabase.from('goals').update({
      name: editName.trim(), target_amount: t,
      current_amount: parseFloat(editCurrent) || 0,
      deadline: editDeadline || null, objective_type: editObjectiveType,
      color: editColor,
    }).eq('id', editGoal.id);
    toast.success('Meta atualizada!');
    setEditGoal(null);
    fetchGoals();
  };

  const openFormWithObjective = (key: string) => {
    const obj = OBJECTIVES.find(o => o.key === key);
    setObjectiveType(key);
    if (obj) setName(obj.label);
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const clearForm = () => {
    setName(''); setTarget(''); setCurrent(''); setDeadline('');
    setObjectiveType('custom'); setGoalColor(GOAL_COLORS[0]);
  };

  const getPresets = (targetVal: number) => {
    if (targetVal <= 1000) return [50, 100, 200];
    if (targetVal <= 10000) return [100, 500, 1000];
    return [500, 1000, 5000];
  };

  if (loading) return <div className="p-7 space-y-4"><div className="h-20 rounded-xl bg-muted/30 animate-pulse" /><div className="h-48 rounded-xl bg-muted/30 animate-pulse" /><div className="grid grid-cols-3 gap-4"><div className="h-64 rounded-xl bg-muted/30 animate-pulse" /><div className="h-64 rounded-xl bg-muted/30 animate-pulse" /><div className="h-64 rounded-xl bg-muted/30 animate-pulse" /></div></div>;

  return (
    <div className="p-5 md:p-7 space-y-5" style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* STATS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'METAS ATIVAS', value: String(activeGoals.length), Icon: Target, iconBg: '#f0fdf4', iconColor: '#16a34a' },
          { label: 'CONCLUÍDAS', value: String(completedGoals.length), Icon: Trophy, iconBg: '#fefce8', iconColor: '#d97706' },
          { label: 'TOTAL A ALCANÇAR', value: formatCurrency(totalRemaining), Icon: TrendingUp, iconBg: '#eff6ff', iconColor: '#2563eb' },
          { label: 'MAIOR META', value: biggestGoal ? (biggestGoal.name.length > 16 ? biggestGoal.name.slice(0, 16) + '…' : biggestGoal.name) : '—', subValue: biggestGoal ? formatCurrency(Number(biggestGoal.target_amount)) : undefined, Icon: Star, iconBg: '#f5f3ff', iconColor: '#7c3aed' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3.5 bg-card border border-border rounded-xl p-4" style={{ borderWidth: '1.5px' }}>
            <div className="flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: s.iconBg }}>
              <s.Icon size={18} style={{ color: s.iconColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.label}</p>
              <p className="text-lg font-black tracking-tight truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{s.value}</p>
              {s.subValue && <p className="text-xs" style={{ color: 'var(--text-hint)' }}>{s.subValue}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* NOVA META CARD */}
      <div ref={formRef} className="bg-card rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--border-default)' }}>
        <button onClick={() => setFormOpen(!formOpen)}
          className="w-full flex items-center justify-between p-[18px_20px] cursor-pointer hover:bg-background transition-colors">
          <div className="flex items-center gap-2">
            <PlusCircle size={18} className="text-[#16a34a]" />
            <span className="text-[15px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Nova Meta</span>
            {!formOpen && <span className="text-xs" style={{ color: 'var(--text-hint)', marginLeft: 4 }}>Clique para adicionar uma nova meta financeira</span>}
          </div>
          <motion.div animate={{ rotate: formOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} style={{ color: 'var(--text-hint)' }} />
          </motion.div>
        </button>

        <AnimatePresence>
          {formOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="px-5 pb-5 space-y-4">
                {/* STEP 1: Tipo */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#6b8f6b', letterSpacing: '0.6px' }}>1. Qual é o tipo desta meta?</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {OBJECTIVES.map(obj => {
                      const selected = objectiveType === obj.key;
                      return (
                        <button key={obj.key} onClick={() => { setObjectiveType(obj.key); if (!name || OBJECTIVES.some(o => o.label === name)) setName(obj.label); }}
                          className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer text-center"
                          style={{
                            borderWidth: selected ? 2 : 1.5, borderColor: selected ? '#16a34a' : '#e2e8f0',
                            background: selected ? '#f0fdf4' : 'white', minHeight: 76,
                          }}>
                          {selected && (
                            <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-[#16a34a] flex items-center justify-center">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                          <span className="text-2xl leading-none">{obj.emoji}</span>
                          <span className="text-[11px] font-semibold leading-tight break-words w-full"
                            style={{ color: selected ? '#166534' : '#374151', fontWeight: selected ? 700 : 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {obj.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '16px 0' }} />

                {/* STEP 2: Detalhes */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#6b8f6b', letterSpacing: '0.6px' }}>2. Detalhes da meta</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Nome da meta</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reserva de emergência"
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Valor alvo (R$)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={target} onChange={e => setTarget(e.target.value)} placeholder="10.000,00"
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Já tenho (R$)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0,00"
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none transition-colors" />
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-hint)' }}>Quanto você já tem guardado</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Data limite</label>
                      <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Cor da meta</label>
                      <div className="flex gap-2 mt-1">
                        {GOAL_COLORS.map(c => (
                          <button key={c} onClick={() => setGoalColor(c)}
                            className="rounded-full transition-transform"
                            style={{
                              width: 28, height: 28, background: c,
                              border: goalColor === c ? `2px solid white` : '2px solid transparent',
                              boxShadow: goalColor === c ? `0 0 0 2px ${c}` : 'none',
                              transform: goalColor === c ? 'scale(1.2)' : 'scale(1)',
                            }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '16px 0' }} />

                {/* STEP 3: Preview & Submit */}
                {name.trim() && target && (
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-page)', border: '1.5px solid var(--border-default)' }}>
                    <p className="text-[11px] uppercase font-bold tracking-wide mb-3" style={{ color: 'var(--text-hint)' }}>Prévia da sua meta</p>
                    <div className="bg-card rounded-xl p-4" style={{ borderTop: `4px solid ${goalColor}`, border: '1.5px solid var(--border-default)', borderTopColor: goalColor }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl" style={{ background: goalColor + '20', border: `1.5px solid ${goalColor}40` }}>
                          {OBJECTIVES.find(o => o.key === objectiveType)?.emoji || '🎯'}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>Meta: {formatCurrency(parseFloat(target) || 0)}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full" style={{ background: goalColor, width: `${Math.min(((parseFloat(current) || 0) / (parseFloat(target) || 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={clearForm} className="text-xs" style={{ color: 'var(--text-hint)' }}>Limpar formulário</button>
                  <button onClick={handleAdd} disabled={creating}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] text-white text-sm font-extrabold transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: '#16a34a' }}>
                    {creating ? 'Criando...' : <><PlusCircle size={15} /> Criar Meta</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GOALS SECTION HEADER */}
      {goals.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Minhas Metas</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #d4edda' }}>
              {completedGoals.length}/{goals.length} concluídas
            </span>
          </div>
          <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground cursor-pointer outline-none">
            <option value="recent">Mais recente</option>
            <option value="value">Maior valor</option>
            <option value="deadline">Prazo próximo</option>
            <option value="progress">% concluído</option>
          </select>
        </div>
      )}

      {/* ACTIVE GOALS GRID */}
      {sortedActive.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedActive.map((g, i) => (
            <GoalCard key={g.id} goal={g} index={i} openMenu={openMenu} setOpenMenu={setOpenMenu}
              onQuickAdd={handleQuickAdd} onCustomAdd={handleCustomAdd} onRemove={handleRemove}
              onComplete={handleMarkComplete} onEdit={openEditModal}
              checkins={checkins[g.id] || []} onCheckinToday={() => handleCheckinToday(g.id)} />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 px-6 gap-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <Target size={36} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>Nenhuma meta ainda</h3>
          <p className="text-sm leading-relaxed max-w-[340px]" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Defina seus objetivos financeiros e acompanhe cada passo da sua jornada rumo à liberdade financeira.
          </p>
          <div className="rounded-r-lg p-3 px-4 max-w-[400px]" style={{ background: '#f0fdf4', borderLeft: '3px solid #16a34a' }}>
            <p className="text-[13px] italic" style={{ color: 'var(--text-primary)' }}>
              "Uma meta sem prazo é apenas um sonho. Com prazo, ela se torna um plano."
            </p>
          </div>
          <button onClick={() => { setFormOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
            className="mt-2 px-6 py-3 rounded-[10px] text-white font-extrabold text-sm hover:brightness-110 transition-all" style={{ background: '#16a34a' }}>
            + Criar minha primeira meta
          </button>
          <div className="mt-2">
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-hint)' }}>Sugestões rápidas:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['emergency_fund', 'pay_card', 'save_money', 'buy_house'].map(key => {
                const obj = OBJECTIVES.find(o => o.key === key)!;
                return (
                  <button key={key} onClick={() => openFormWithObjective(key)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors hover:bg-secondary"
                    style={{ border: '1px solid #d4edda', color: '#166534', background: 'white' }}>
                    {obj.emoji} {obj.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED GOALS */}
      {completedGoals.length > 0 && (
        <CompletedSection goals={completedGoals} />
      )}

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editGoal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setEditGoal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-7 w-full max-w-[520px] space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Editar Meta</h3>
                <button onClick={() => setEditGoal(null)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background transition-colors">
                  <X size={16} style={{ color: 'var(--text-hint)' }} />
                </button>
              </div>

              {/* Objective tiles */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {OBJECTIVES.map(obj => (
                  <button key={obj.key} onClick={() => setEditObjectiveType(obj.key)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center"
                    style={{ borderWidth: editObjectiveType === obj.key ? 2 : 1.5, borderColor: editObjectiveType === obj.key ? '#16a34a' : '#e2e8f0', background: editObjectiveType === obj.key ? '#f0fdf4' : 'white' }}>
                    <span className="text-lg">{obj.emoji}</span>
                    <span className="text-[10px] font-semibold leading-tight break-words w-full" style={{ color: editObjectiveType === obj.key ? '#166534' : '#374151', whiteSpace: 'normal', wordBreak: 'break-word' }}>{obj.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Nome</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Valor alvo</label>
                  <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={editTarget} onChange={e => setEditTarget(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Valor atual</label>
                  <input type="text" inputMode="decimal" pattern="[0-9.,]*" value={editCurrent} onChange={e => setEditCurrent(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Prazo</label>
                  <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:border-[#16a34a] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Cor</label>
                  <div className="flex gap-2 mt-1">
                    {GOAL_COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)} className="rounded-full transition-transform"
                        style={{ width: 24, height: 24, background: c, border: editColor === c ? '2px solid white' : '2px solid transparent', boxShadow: editColor === c ? `0 0 0 2px ${c}` : 'none', transform: editColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditGoal(null)} className="px-4 py-2 text-sm font-semibold rounded-lg text-muted-foreground hover:bg-background transition-colors">Cancelar</button>
                <button onClick={handleSaveEdit} className="px-5 py-2 text-sm font-extrabold rounded-lg text-white transition-all hover:brightness-110" style={{ background: '#16a34a' }}>Salvar alterações</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── GOAL CARD COMPONENT ─── */
function GoalCard({ goal: g, index: i, openMenu, setOpenMenu, onQuickAdd, onCustomAdd, onRemove, onComplete, onEdit, checkins, onCheckinToday }: {
  goal: any; index: number; openMenu: string | null; setOpenMenu: (id: string | null) => void;
  onQuickAdd: (id: string, amount: number) => void; onCustomAdd: (id: string, val: string) => void;
  onRemove: (id: string) => void; onComplete: (id: string) => void; onEdit: (g: any) => void;
  checkins: any[]; onCheckinToday: () => void;
}) {
  const pct = Math.min((Number(g.current_amount) / Number(g.target_amount)) * 100, 100);
  const obj = OBJECTIVES.find(o => o.key === g.objective_type);
  const color = g.color || '#16a34a';
  const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
  const daysLeft = g.deadline ? differenceInDays(parseISO(g.deadline), new Date()) : null;
  const targetNum = Number(g.target_amount);

  const presets = targetNum <= 1000 ? [50, 100, 200] : targetNum <= 10000 ? [100, 500, 1000] : [500, 1000, 5000];

  const getDaysColor = () => {
    if (daysLeft === null) return '#64748b';
    if (daysLeft < 0) return '#dc2626';
    if (daysLeft < 10) return '#dc2626';
    if (daysLeft < 30) return '#d97706';
    return '#16a34a';
  };

  const getDaysText = () => {
    if (daysLeft === null) return 'Sem prazo definido';
    if (daysLeft < 0) return 'Prazo vencido';
    if (daysLeft < 10) return `Urgente — ${daysLeft} dias!`;
    return `${daysLeft} dias restantes`;
  };

  const getStatusBadge = () => {
    if (pct >= 100) return { bg: '#fefce8', border: '#fde68a', color: '#92400e', text: '🏆 Meta concluída! Parabéns!' };
    if (pct >= 70) return { bg: '#f0fdf4', border: '#d4edda', color: '#166534', text: '✓ Quase lá! Continue assim.' };
    if (pct >= 30) return { bg: '#fffbeb', border: '#fde68a', color: '#92400e', text: '↑ No caminho certo' };
    if (daysLeft !== null && daysLeft > 0) {
      const daily = remaining / daysLeft;
      return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', text: `Precisa de ${formatCurrency(daily)}/dia para atingir` };
    }
    return { bg: '#f8fafc', border: '#e2e8f0', color: 'var(--text-secondary)', text: 'Começando a jornada 💪' };
  };

  const status = getStatusBadge();
  const customInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}
      className="bg-card rounded-2xl p-5 relative group transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderTop: `4px solid ${color}`, border: `1.5px solid #e2e8f0`, borderTopColor: color, borderTopWidth: 4 }}>
      {/* Top */}
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: color + '20', border: `1.5px solid ${color}40` }}>
          {obj?.emoji || '🎯'}
        </div>
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-background transition-colors">
            <MoreHorizontal size={16} style={{ color: 'var(--text-hint)' }} />
          </button>
          {openMenu === g.id && (
            <div className="absolute right-0 top-9 bg-card rounded-[10px] py-1 z-50 min-w-[180px]" style={{ border: '1px solid var(--border-default)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              onClick={e => e.stopPropagation()}>
              {[
                { icon: Pencil, label: '✏️ Editar meta', action: () => onEdit(g), danger: false },
                { icon: DollarSign, label: '💰 Atualizar valor', action: () => customInputRef.current?.focus(), danger: false },
                { icon: Award, label: '🏆 Marcar como concluída', action: () => onComplete(g.id), danger: false },
                { icon: Trash2, label: '🗑️ Excluir meta', action: () => { if (confirm('Excluir esta meta?')) onRemove(g.id); }, danger: true },
              ].map((item, idx) => (
                <button key={idx} onClick={item.action}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-background transition-colors"
                  style={{ color: item.danger ? '#dc2626' : '#374151' }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <p className="mt-3 text-base font-extrabold leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{g.name}</p>

      {/* Objective badge */}
      {obj && (
        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + '15', color: color, border: `1px solid ${color}30` }}>
          {obj.label}
        </span>
      )}

      {/* Target + deadline */}
      <div className="flex flex-wrap gap-3 mt-2">
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Target size={12} style={{ color: 'var(--text-hint)' }} /> Meta: {formatCurrency(targetNum)}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Calendar size={12} style={{ color: 'var(--text-hint)' }} /> {g.deadline ? format(parseISO(g.deadline), 'dd/MM/yyyy') : 'Sem prazo'}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: getDaysColor() }}>
          <Clock size={12} /> {getDaysText()}
        </span>
      </div>

      {/* Divider */}
      <div className="my-3.5" style={{ borderTop: '1px solid #f8fafc' }} />

      {/* Progress */}
      <div className="flex items-baseline justify-between">
        <span className="text-[32px] font-black leading-none" style={{ color, letterSpacing: '-1px' }}>{pct.toFixed(0)}%</span>
        <span className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-bold" style={{ color }}>{formatCurrency(Number(g.current_amount))}</span>
          <span style={{ color: 'var(--text-hint)' }}> / {formatCurrency(targetNum)}</span>
        </span>
      </div>

      <div className="mt-2.5 h-2.5 rounded-full overflow-hidden relative" style={{ background: 'var(--bg-elevated)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="h-full rounded-full relative overflow-hidden" style={{ background: color }}>
          <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', animation: 'shimmer 2s infinite' }} />
        </motion.div>
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{formatCurrency(Number(g.current_amount))} guardados</span>
        <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>Faltam {formatCurrency(remaining)}</span>
      </div>

      {/* Status badge */}
      <div className="mt-2.5 text-center">
        <span className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>
          {status.text}
        </span>
      </div>

      {/* Daily Check-in Tracker */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f8fafc' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame size={13} style={{ color: '#d97706' }} />
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Streak diário</span>
            {(() => {
              let streak = 0;
              for (let d = 0; d < 30; d++) {
                const day = format(subDays(new Date(), d), 'yyyy-MM-dd');
                if (checkins.some(c => c.date === day)) streak++;
                else break;
              }
              return streak > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fefce8', color: '#d97706', border: '1px solid #fde68a' }}>
                  🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
                </span>
              ) : null;
            })()}
          </div>
          <button onClick={onCheckinToday}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all active:scale-95"
            style={{
              background: checkins.some(c => c.date === format(new Date(), 'yyyy-MM-dd')) ? '#16a34a' : '#f0fdf4',
              color: checkins.some(c => c.date === format(new Date(), 'yyyy-MM-dd')) ? 'white' : '#166534',
              border: `1px solid ${checkins.some(c => c.date === format(new Date(), 'yyyy-MM-dd')) ? '#16a34a' : '#d4edda'}`,
            }}>
            <Check size={11} />
            {checkins.some(c => c.date === format(new Date(), 'yyyy-MM-dd')) ? 'Feito hoje ✓' : 'Marcar hoje'}
          </button>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, idx) => {
            const day = subDays(new Date(), 6 - idx);
            const dayStr = format(day, 'yyyy-MM-dd');
            const ck = checkins.find(c => c.date === dayStr);
            const isToday = isSameDay(day, new Date());
            const dayLabel = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][day.getDay()];
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-hint)' }}>{dayLabel}</span>
                <div className="w-full aspect-square rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: ck ? (Number(ck.amount) > 0 ? '#16a34a' : '#86efac') : (isToday ? '#f8faf8' : '#f1f5f9'),
                    border: isToday ? '1.5px solid #16a34a' : '1px solid transparent',
                  }}>
                  {ck ? (
                    <Check size={12} style={{ color: Number(ck.amount) > 0 ? 'white' : '#166534' }} />
                  ) : (
                    <span className="text-[9px]" style={{ color: '#cbd5e1' }}>{format(day, 'd')}</span>
                  )}
                </div>
                {ck && Number(ck.amount) > 0 && (
                  <span className="text-[8px] font-bold" style={{ color: '#16a34a' }}>+{Number(ck.amount).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3.5 pt-3.5 flex flex-wrap items-center gap-2" style={{ borderTop: '1px solid #f8fafc' }}>
        <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>Adicionar:</span>
        {presets.map(p => (
          <button key={p} onClick={() => onQuickAdd(g.id, p)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors active:scale-95 hover:bg-[#dcfce7]"
            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #d4edda' }}>
            {formatCurrency(p)}
          </button>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[100px]">
          <input ref={customInputRef} type="text" inputMode="decimal" pattern="[0-9.,]*" placeholder="R$ ___" className="flex-1 h-8 text-xs px-2 rounded-lg border border-border outline-none focus:border-[#16a34a]"
            onKeyDown={e => { if (e.key === 'Enter') { onCustomAdd(g.id, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
          <button onClick={() => { if (customInputRef.current) { onCustomAdd(g.id, customInputRef.current.value); customInputRef.current.value = ''; } }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold" style={{ background: '#16a34a' }}>+</button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── COMPLETED SECTION ─── */
function CompletedSection({ goals }: { goals: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 mb-3 cursor-pointer">
        <span className="text-[15px] font-extrabold" style={{ color: '#d97706' }}>🏆 Metas Concluídas</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: '#d97706' }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g, i) => {
              const obj = OBJECTIVES.find(o => o.key === g.objective_type);
              return (
                <motion.div key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-5 opacity-75" style={{ borderTop: '4px solid #d97706', border: '1.5px solid var(--border-default)', borderTopColor: '#d97706', borderTopWidth: 4 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#fefce820', border: '1.5px solid #fde68a' }}>
                      {obj?.emoji || '🎯'}
                    </div>
                    <div>
                      <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{g.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{formatCurrency(Number(g.target_amount))}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full" style={{ background: '#d97706' }} />
                  <div className="mt-2 text-center">
                    <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: '#fefce8', border: '1px solid #fde68a', color: '#92400e' }}>
                      🏆 Concluída!
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

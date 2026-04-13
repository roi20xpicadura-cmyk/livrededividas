import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, PLAN_LIMITS, PlanType } from '@/lib/plans';
import { OBJECTIVES, getObjectiveBorderColor } from '@/lib/objectives';
import { Plus, X, Check, Target } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function GoalsPage() {
  const { user } = useAuth();
  const { profile, config } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const limits = PLAN_LIMITS[plan];
  const userObjectives = config?.financial_objectives || [];

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [start, setStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deadline, setDeadline] = useState('');
  const [objectiveType, setObjectiveType] = useState('custom');

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, [user]);

  const handleAdd = async () => {
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    if (!name.trim() || isNaN(t) || t <= 0 || !deadline) { toast.error('Preencha todos os campos'); return; }
    if (limits.goals !== Infinity && goals.length >= limits.goals) { toast.error('Limite de metas atingido. Faça upgrade!'); return; }

    await supabase.from('goals').insert({
      user_id: user!.id, name: name.trim(), target_amount: t, current_amount: c,
      start_date: start, deadline, objective_type: objectiveType,
      is_highlighted: userObjectives.includes(objectiveType),
    });
    toast.success('Meta criada!');
    setName(''); setTarget(''); setCurrent(''); setDeadline(''); setObjectiveType('custom');
    fetchGoals();
  };

  const handleUpdate = async (id: string, val: number) => {
    await supabase.from('goals').update({ current_amount: val }).eq('id', id);
    fetchGoals();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover meta?')) return;
    await supabase.from('goals').delete().eq('id', id);
    toast.success('Meta removida');
    fetchGoals();
  };

  const achieved = goals.filter(g => Number(g.current_amount) >= Number(g.target_amount)).length;
  const highlighted = goals.filter(g => g.is_highlighted || userObjectives.includes(g.objective_type));
  const regular = goals.filter(g => !g.is_highlighted && !userObjectives.includes(g.objective_type));

  if (loading) return <div className="card-surface p-8 h-96 animate-pulse" />;

  const renderGoalCard = (g: any, i: number) => {
    const pct = Math.min((Number(g.current_amount) / Number(g.target_amount)) * 100, 100);
    const done = Number(g.current_amount) >= Number(g.target_amount);
    const daysLeft = g.deadline ? Math.max(0, differenceInDays(parseISO(g.deadline), new Date())) : 0;
    const obj = OBJECTIVES.find(o => o.key === g.objective_type);
    const borderColor = getObjectiveBorderColor(g.objective_type || 'custom');

    return (
      <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
        className={`card-surface p-4 relative border-t-[3px] ${borderColor} ${done ? 'bg-fin-green-pale' : ''}`}>
        <button onClick={() => handleRemove(g.id)} className="absolute top-3 right-3 text-muted hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
        {obj && <span className="text-3xl block mb-2">{obj.emoji}</span>}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm text-foreground">{g.name}</span>
          {done && <Check className="w-4 h-4 text-fin-green" />}
        </div>
        <p className="text-[10px] text-muted">Meta: {formatCurrency(Number(g.target_amount))} · Prazo: {g.deadline ? format(parseISO(g.deadline), 'dd/MM/yyyy') : '—'}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm metric-value text-fin-green">{formatCurrency(Number(g.current_amount))}</span>
          <span className="text-xs font-bold text-muted">{pct.toFixed(0)}%</span>
        </div>
        <div className="mt-1.5 h-2.5 bg-fin-green-border rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${done ? 'bg-gold' : 'bg-fin-green'}`} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted">{done ? '✓ Concluída' : `Faltam: ${formatCurrency(Number(g.target_amount) - Number(g.current_amount))}`}</span>
          {!done && <span className="text-[10px] text-muted">{daysLeft} dias</span>}
        </div>
        <input type="number" placeholder="Atualizar valor" className="w-full mt-2 px-2 py-1.5 text-xs rounded-lg border border-border bg-card"
          onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) { handleUpdate(g.id, v); (e.target as HTMLInputElement).value = ''; } } }} />
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="card-surface p-4 bg-fin-green-pale">
        {/* Objective type selector */}
        <p className="text-xs font-bold text-fin-green-dark mb-2">Qual é o tipo desta meta?</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-4">
          {OBJECTIVES.map(obj => (
            <button key={obj.key} onClick={() => { setObjectiveType(obj.key); if (!name) setName(obj.label); }}
              className={`p-2 rounded-lg border text-center transition-all text-[10px] ${
                objectiveType === obj.key ? 'border-primary bg-fin-green-pale font-bold text-primary' : 'border-border bg-card text-muted hover:border-fin-green-border'
              }`}>
              <span className="text-lg block">{obj.emoji}</span>
              <span className="truncate block">{obj.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input placeholder="Nome da meta" value={name} onChange={e => setName(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Valor alvo" value={target} onChange={e => setTarget(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Valor atual" value={current} onChange={e => setCurrent(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <button onClick={handleAdd} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all">
            <Plus className="w-3.5 h-3.5" /> Criar Meta
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-fin-green" />
        <span className="text-[13px] font-extrabold text-fin-green-dark">Metas</span>
        <span className="px-2 py-0.5 rounded-full bg-fin-green-pale text-fin-green text-[10px] font-bold">{achieved}/{goals.length} concluídas</span>
      </div>

      {/* Highlighted goals */}
      {highlighted.length > 0 && (
        <div>
          <p className="text-xs font-bold text-fin-green-dark mb-2">⭐ Objetivos em destaque</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highlighted.map((g, i) => renderGoalCard(g, i))}
          </div>
        </div>
      )}

      {/* Regular goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {regular.map((g, i) => renderGoalCard(g, i))}
      </div>
      {goals.length === 0 && <p className="text-center text-sm text-muted py-8">Nenhuma meta criada</p>}
    </div>
  );
}

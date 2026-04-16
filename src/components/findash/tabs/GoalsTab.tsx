import { useState } from "react";
import { Goal } from "@/types/kora";
import { format, parseISO, differenceInDays } from "date-fns";
import { Plus, X, Check, Target } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  goals: Goal[];
  currency: string;
  onAdd: (g: Omit<Goal, 'id'>) => void;
  onUpdate: (id: string, p: Partial<Goal>) => void;
  onRemove: (id: string) => void;
}

function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function GoalsTab({ goals, currency, onAdd, onUpdate, onRemove }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deadline, setDeadline] = useState("");

  const achieved = goals.filter(g => g.current >= g.target).length;

  const handleAdd = () => {
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    if (!name.trim() || isNaN(t) || t <= 0 || !deadline) return;
    onAdd({ name: name.trim(), target: t, current: c, start, deadline });
    setName(""); setTarget(""); setCurrent(""); setDeadline("");
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-4 bg-fin-green-pale">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input placeholder="Nome da meta" value={name} onChange={e => setName(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Valor alvo" value={target} onChange={e => setTarget(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Valor atual" value={current} onChange={e => setCurrent(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <button onClick={handleAdd} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all duration-200">
            <Plus className="w-3.5 h-3.5" /> Criar Meta
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-fin-green" />
        <span className="text-[13px] font-extrabold text-fin-green-dark">Metas</span>
        <span className="px-2 py-0.5 rounded-full bg-fin-green-pale text-fin-green text-[10px] font-bold">{achieved}/{goals.length} concluídas</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {goals.map((g, i) => {
          const pct = Math.min((g.current / g.target) * 100, 100);
          const done = g.current >= g.target;
          const daysLeft = Math.max(0, differenceInDays(parseISO(g.deadline), new Date()));
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`card-surface p-4 relative ${done ? 'bg-fin-green-pale' : ''}`}>
              <button onClick={() => { if (confirm("Remover meta?")) onRemove(g.id); }}
                className="absolute top-3 right-3 text-muted hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-foreground">{g.name}</span>
                {done && <Check className="w-4 h-4 text-fin-green" />}
              </div>
              <p className="text-[10px] text-muted">Meta: {fmt(g.target, currency)} · Prazo: {format(parseISO(g.deadline), "dd/MM/yyyy")}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm metric-value text-fin-green">{fmt(g.current, currency)}</span>
                <span className="text-xs font-bold text-muted">{pct.toFixed(0)}%</span>
              </div>
              <div className="mt-1.5 h-2.5 bg-fin-green-border rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${done ? 'bg-gold' : 'bg-fin-green'}`} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted">{done ? '✓ Concluída' : `Faltam: ${fmt(g.target - g.current, currency)}`}</span>
                {!done && <span className="text-[10px] text-muted">{daysLeft} dias restantes</span>}
              </div>
              <div className="mt-2">
                <input type="number" placeholder="Atualizar valor" className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-card"
                  onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) { onUpdate(g.id, { current: v }); (e.target as HTMLInputElement).value = ''; } } }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      {goals.length === 0 && <p className="text-center text-sm text-muted py-8">Nenhuma meta criada</p>}
    </div>
  );
}

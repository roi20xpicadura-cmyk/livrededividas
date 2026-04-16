import { useState } from "react";
import { CreditCard as CreditCardType } from "@/types/kora";
import { Plus, X, CreditCard as CreditCardIcon } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  cards: CreditCardType[];
  currency: string;
  onAdd: (c: Omit<CreditCardType, 'id'>) => void;
  onUpdate: (id: string, p: Partial<CreditCardType>) => void;
  onRemove: (id: string) => void;
}

function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CARD_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#d97706', '#0891b2'];

export default function CardsTab({ cards, currency, onAdd, onUpdate, onRemove }: Props) {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [used, setUsed] = useState("");
  const [due, setDue] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);

  const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalUsed = cards.reduce((s, c) => s + c.used, 0);

  const handleAdd = () => {
    const l = parseFloat(limit);
    const u = parseFloat(used) || 0;
    const d = parseInt(due);
    if (!name.trim() || isNaN(l) || l <= 0 || isNaN(d)) return;
    onAdd({ name: name.trim(), limit: l, used: u, due: d, color });
    setName(""); setLimit(""); setUsed(""); setDue("");
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-4 bg-fin-green-pale">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input placeholder="Nome do cartão" value={name} onChange={e => setName(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Limite" value={limit} onChange={e => setLimit(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Usado" value={used} onChange={e => setUsed(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Vencimento (dia)" value={due} onChange={e => setDue(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <div className="flex gap-1 items-center">
            {CARD_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={handleAdd} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all duration-200">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div><p className="label-upper text-muted">Limite Total</p><p className="metric-value text-fin-green">{fmt(totalLimit, currency)}</p></div>
        <div><p className="label-upper text-muted">Utilizado Total</p><p className="metric-value text-fin-red">{fmt(totalUsed, currency)}</p></div>
        <div><p className="label-upper text-muted">Disponível</p><p className="metric-value text-fin-blue">{fmt(totalLimit - totalUsed, currency)}</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card, i) => {
          const pct = card.limit > 0 ? (card.used / card.limit) * 100 : 0;
          const available = card.limit - card.used;
          return (
            <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-surface p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: card.color }} />
              <button onClick={() => { if (confirm("Remover cartão?")) onRemove(card.id); }}
                className="absolute top-3 right-3 text-muted hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
              <div className="flex items-center gap-2 mb-3 mt-1">
                <CreditCardIcon className="w-5 h-5" style={{ color: card.color }} />
                <span className="font-bold text-sm">{card.name}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Usado: {fmt(card.used, currency)}</span>
                <span className="font-bold">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-fin-green-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? 'bg-fin-red' : pct > 50 ? 'bg-fin-amber' : 'bg-fin-green'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted">
                <span>Limite: {fmt(card.limit, currency)}</span>
                <span>Disponível: {fmt(available, currency)}</span>
              </div>
              <p className="text-[10px] text-muted mt-1">Vencimento: dia {card.due}</p>
              <input type="number" placeholder="Atualizar valor usado" className="w-full mt-2 px-2 py-1.5 text-xs rounded-lg border border-border bg-card"
                onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) { onUpdate(card.id, { used: v }); (e.target as HTMLInputElement).value = ''; } } }}
              />
            </motion.div>
          );
        })}
      </div>
      {cards.length === 0 && <p className="text-center text-sm text-muted py-8">Nenhum cartão cadastrado</p>}
    </div>
  );
}

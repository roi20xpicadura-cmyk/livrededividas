import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, X } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  demoStore,
  formatBRL,
  useDemoStore,
} from '../demoStore';

export default function DemoTransactions() {
  const txs = useDemoStore((s) => s.txs);
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (filter === 'in' && t.amount < 0) return false;
      if (filter === 'out' && t.amount > 0) return false;
      if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [txs, filter, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((t) => {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] md:text-[22px] font-[800] text-[#1A0D35]">Transações</h2>
          <p className="text-[12px] md:text-[13px] text-[#7B6A9B]">{filtered.length} lançamentos</p>
        </div>
        <button
          onClick={() => setSheet(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7C3AED] text-white text-[12.5px] font-bold hover:bg-[#6D28D9] transition-colors"
          style={{ boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B6A9B]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[rgba(124,58,237,0.12)] text-[12.5px] text-[#1A0D35] placeholder:text-[#B8A8D8] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F0EEFF]">
          {[
            { k: 'all', label: 'Tudo' },
            { k: 'in', label: 'Entradas' },
            { k: 'out', label: 'Saídas' },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => setFilter(opt.k as typeof filter)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                filter === opt.k ? 'bg-white text-[#1A0D35] shadow-sm' : 'text-[#7B6A9B]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-[16px] bg-white border border-[rgba(124,58,237,0.12)] overflow-hidden">
        {grouped.length === 0 && (
          <div className="p-8 text-center text-[12.5px] text-[#7B6A9B]">Nada por aqui ainda.</div>
        )}
        {grouped.map(([date, items]) => (
          <div key={date}>
            <div className="px-4 py-2 bg-[#FAFAFE] text-[10.5px] uppercase tracking-wider font-bold text-[#7B6A9B]">
              {formatDateLabel(date)}
            </div>
            {items.map((t) => (
              <div key={t.id} className="group flex items-center justify-between px-4 py-2.5 border-t border-[#F0EEFF]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[14px] flex-shrink-0">
                    {CATEGORY_EMOJI[t.category] ?? '📦'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#1A0D35] truncate">{t.description}</div>
                    <div className="text-[10.5px] text-[#7B6A9B]">{t.category} · {t.account}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`text-[13px] font-[800] tabular-nums ${t.amount > 0 ? 'text-[#16A34A]' : 'text-[#1A0D35]'}`}>
                    {t.amount > 0 ? '+' : ''}{formatBRL(t.amount)}
                  </div>
                  <button
                    onClick={() => demoStore.removeTx(t.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#FEF2F2] text-[#DC2626]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <AnimatePresence>{sheet && <NewTxSheet onClose={() => setSheet(false)} />}</AnimatePresence>
    </div>
  );
}

function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
}

function NewTxSheet({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<'out' | 'in'>('out');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Mercado');

  const submit = () => {
    const v = parseFloat(amount.replace(',', '.'));
    if (!v || !description.trim()) return;
    demoStore.addTx({
      description: description.trim(),
      category,
      amount: type === 'out' ? -Math.abs(v) : Math.abs(v),
      account: 'Pix',
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-black/40 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-[800] text-[#1A0D35]">Nova transação</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F0EEFF]">
            <X className="w-4 h-4 text-[#7B6A9B]" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F0EEFF] mb-3">
          <button
            onClick={() => setType('out')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
              type === 'out' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-[#7B6A9B]'
            }`}
          >
            Saída
          </button>
          <button
            onClick={() => setType('in')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
              type === 'in' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-[#7B6A9B]'
            }`}
          >
            Entrada
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[#7B6A9B]">Valor</label>
            <div className="flex items-center mt-1 px-3 py-2.5 rounded-xl border border-[rgba(124,58,237,0.18)] focus-within:border-[#7C3AED]">
              <span className="text-[18px] font-[800] text-[#7B6A9B] mr-1.5">R$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="flex-1 text-[20px] font-[800] text-[#1A0D35] focus:outline-none placeholder:text-[#B8A8D8] tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[#7B6A9B]">Descrição</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: iFood — almoço"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-[rgba(124,58,237,0.18)] text-[13px] text-[#1A0D35] focus:outline-none focus:border-[#7C3AED] placeholder:text-[#B8A8D8]"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[#7B6A9B]">Categoria</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-1.5 py-2 rounded-lg text-[10.5px] font-bold border transition-all ${
                    category === c
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                      : 'bg-white text-[#2A1A4F] border-[rgba(124,58,237,0.12)] hover:border-[#7C3AED]'
                  }`}
                >
                  <div className="text-[14px]">{CATEGORY_EMOJI[c]}</div>
                  <div className="leading-tight mt-0.5 truncate">{c}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          className="w-full mt-4 py-3 rounded-xl bg-[#7C3AED] text-white text-[14px] font-[800] hover:bg-[#6D28D9] transition-colors"
          style={{ boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}
        >
          Lançar
        </button>
      </motion.div>
    </motion.div>
  );
}

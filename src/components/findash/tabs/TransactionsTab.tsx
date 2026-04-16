import { useState, useMemo } from "react";
import { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/types/kora";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  filteredTx: Transaction[];
  currency: string;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onRemove: (id: string) => void;
}

function fmt(val: number, c: string) {
  return `${c} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionsTab({ filteredTx, currency, onAdd, onRemove }: Props) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [origin, setOrigin] = useState<'business' | 'personal'>('business');
  const [cat, setCat] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'business' | 'personal'>('all');
  const [search, setSearch] = useState("");

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleAdd = () => {
    const v = parseFloat(val);
    if (!date || !desc.trim() || isNaN(v) || v <= 0 || !cat) return;
    onAdd({ date, desc: desc.trim(), val: v, type, origin, cat });
    setDesc(""); setVal(""); setCat("");
  };

  const filtered = useMemo(() => {
    return filteredTx
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => filterOrigin === 'all' || t.origin === filterOrigin)
      .filter(t => !search || t.desc.toLowerCase().includes(search.toLowerCase()) || t.cat.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTx, filterType, filterOrigin, search]);

  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.val, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.val, 0);
    return { inc, exp, net: inc - exp };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Add Form */}
      <div className="card-surface p-4 bg-fin-green-pale">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg border border-border bg-card col-span-2 md:col-span-1" />
          <input type="number" placeholder="Valor" value={val} onChange={e => setVal(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <select value={type} onChange={e => { setType(e.target.value as any); setCat(""); }}
            className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value as any)}
            className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            <option value="business">Negócio</option>
            <option value="personal">Pessoal</option>
          </select>
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            <option value="">Categoria</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleAdd}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all duration-200">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'income', 'expense'] as const).map(ft => (
          <button key={ft} onClick={() => setFilterType(ft)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-200 ${filterType === ft ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            {ft === 'all' ? 'Todos' : ft === 'income' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
        <div className="w-px h-5 bg-border" />
        {(['all', 'business', 'personal'] as const).map(fo => (
          <button key={fo} onClick={() => setFilterOrigin(fo)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-200 ${filterOrigin === fo ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            {fo === 'all' ? 'Todos' : fo === 'business' ? 'Negócio' : 'Pessoal'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card w-44" />
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['#', 'Data', 'Descrição', 'Categoria', 'Origem', 'Tipo', 'Valor', ''].map(h => (
                <th key={h} className={`px-3 py-2.5 label-upper text-muted ${h === 'Valor' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((tx, i) => (
                <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={`border-b border-border/50 hover:bg-secondary/50 transition-colors border-l-2 ${tx.type === 'income' ? 'border-l-fin-green' : 'border-l-fin-red'}`}>
                  <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium">{format(parseISO(tx.date), "dd/MM/yy")}</td>
                  <td className="px-3 py-2.5">{tx.desc}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold">{tx.cat}</span></td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.origin === 'business' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-amber-pale text-fin-amber'}`}>
                      {tx.origin === 'business' ? 'Negócio' : 'Pessoal'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.type === 'income' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-red-pale text-fin-red'}`}>
                      {tx.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 text-right metric-value ${tx.type === 'income' ? 'text-fin-green' : 'text-fin-red'}`}>
                    {tx.type === 'expense' ? '−' : '+'}{fmt(tx.val, currency)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => { if (confirm("Remover?")) onRemove(tx.id); }}
                      className="text-muted hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-fin-green-pale border-t border-border">
            <div><p className="label-upper text-muted">Total Receitas</p><p className="metric-value text-fin-green">{fmt(totals.inc, currency)}</p></div>
            <div><p className="label-upper text-muted">Total Despesas</p><p className="metric-value text-fin-red">{fmt(totals.exp, currency)}</p></div>
            <div><p className="label-upper text-muted">Saldo</p><p className={`metric-value ${totals.net >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{fmt(totals.net, currency)}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

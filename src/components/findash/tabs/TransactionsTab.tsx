import { useState, useMemo } from "react";
import { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/types/findash";
import { format, parseISO } from "date-fns";
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

  const inputClass = "px-3 py-2.5 text-[13px] rounded-xl border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";

  return (
    <div className="space-y-4">
      {/* Add Form */}
      <div className="card-surface p-5">
        <p className="section-title mb-4">Novo Lançamento</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          <input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)}
            className={`${inputClass} col-span-2 md:col-span-1`} />
          <input type="number" placeholder="Valor" value={val} onChange={e => setVal(e.target.value)} className={inputClass} />
          <select value={type} onChange={e => { setType(e.target.value as 'income' | 'expense'); setCat(""); }} className={inputClass}>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value as 'business' | 'personal')} className={inputClass}>
            <option value="business">Negócio</option>
            <option value="personal">Pessoal</option>
          </select>
          <select value={cat} onChange={e => setCat(e.target.value)} className={inputClass}>
            <option value="">Categoria</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleAdd}
            className="btn-primary flex items-center justify-center gap-1.5 h-auto rounded-xl">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'income', 'expense'] as const).map(ft => (
          <button key={ft} onClick={() => setFilterType(ft)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
              filterType === ft ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'
            }`}>
            {ft === 'all' ? 'Todos' : ft === 'income' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
        <div className="w-px h-5 bg-border" />
        {(['all', 'business', 'personal'] as const).map(fo => (
          <button key={fo} onClick={() => setFilterOrigin(fo)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
              filterOrigin === fo ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'
            }`}>
            {fo === 'all' ? 'Todos' : fo === 'business' ? 'Negócio' : 'Pessoal'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="pl-9 pr-4 py-2 text-[13px] rounded-xl border border-border bg-background w-48 focus:border-primary transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/40">
              {['#', 'Data', 'Descrição', 'Categoria', 'Origem', 'Tipo', 'Valor', ''].map(h => (
                <th key={h} className={`px-5 py-3 label-upper ${h === 'Valor' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((tx, i) => (
                <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-muted-foreground">{format(parseISO(tx.date), "dd/MM/yy")}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{tx.desc}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 rounded-md bg-secondary text-[11px] font-semibold">{tx.cat}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${tx.origin === 'business' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-amber-pale text-fin-amber'}`}>
                      {tx.origin === 'business' ? 'Negócio' : 'Pessoal'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${tx.type === 'income' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-red-pale text-fin-red'}`}>
                      {tx.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right metric-value ${tx.type === 'income' ? 'text-fin-green' : 'text-fin-red'}`}>
                    {tx.type === 'expense' ? '−' : '+'}{fmt(tx.val, currency)}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => { if (confirm("Remover?")) onRemove(tx.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-6 p-5 border-t border-border/30 bg-secondary/20">
            <div>
              <p className="label-upper mb-1">Total Receitas</p>
              <p className="metric-value text-fin-green text-lg">{fmt(totals.inc, currency)}</p>
            </div>
            <div>
              <p className="label-upper mb-1">Total Despesas</p>
              <p className="metric-value text-fin-red text-lg">{fmt(totals.exp, currency)}</p>
            </div>
            <div>
              <p className="label-upper mb-1">Saldo</p>
              <p className={`metric-value text-lg ${totals.net >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{fmt(totals.net, currency)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

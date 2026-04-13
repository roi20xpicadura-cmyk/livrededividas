import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, PLAN_LIMITS, PlanType } from '@/lib/plans';
import { Plus, X, Search } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const INCOME_CATS = ['Salário', 'Freelance', 'Vendas', 'Investimento', 'Aluguel', 'Outro'];
const EXPENSE_CATS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Marketing', 'Fornecedor', 'Impostos', 'Salários Equipe', 'Outro'];

export default function TransactionsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  const limits = PLAN_LIMITS[plan];

  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [origin, setOrigin] = useState<'business' | 'personal'>('business');
  const [cat, setCat] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'business' | 'personal'>('all');
  const [search, setSearch] = useState('');

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const fetchTxs = async () => {
    if (!user) return;
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false });
    setTxs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTxs(); }, [user]);

  const handleAdd = async () => {
    const v = parseFloat(val);
    if (!date || !desc.trim() || isNaN(v) || v <= 0 || !cat) { toast.error('Preencha todos os campos'); return; }

    // Check limit
    if (limits.transactions_per_month !== Infinity && txs.length >= limits.transactions_per_month) {
      toast.error(`Limite de ${limits.transactions_per_month} lançamentos atingido. Faça upgrade!`);
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user!.id, date, description: desc.trim(), amount: v, type, origin, category: cat,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Lançamento adicionado!');
    setDesc(''); setVal(''); setCat('');
    fetchTxs();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover lançamento?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    toast.success('Removido');
    fetchTxs();
  };

  const filtered = useMemo(() => {
    return txs
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => filterOrigin === 'all' || t.origin === filterOrigin)
      .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
  }, [txs, filterType, filterOrigin, search]);

  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { inc, exp, net: inc - exp };
  }, [filtered]);

  if (loading) return <div className="card-surface p-8 h-96 animate-pulse" />;

  return (
    <div className="space-y-4">
      {limits.transactions_per_month !== Infinity && (
        <div className="text-xs font-semibold text-muted">{txs.length}/{limits.transactions_per_month} lançamentos este mês</div>
      )}

      <div className="card-surface p-4 bg-fin-green-pale">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card col-span-2 md:col-span-1" />
          <input type="number" placeholder="Valor" value={val} onChange={e => setVal(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <select value={type} onChange={e => { setType(e.target.value as any); setCat(''); }} className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            <option value="income">Receita</option><option value="expense">Despesa</option>
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value as any)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            <option value="business">Negócio</option><option value="personal">Pessoal</option>
          </select>
          <select value={cat} onChange={e => setCat(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            <option value="">Categoria</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleAdd} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'income', 'expense'] as const).map(ft => (
          <button key={ft} onClick={() => setFilterType(ft)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterType === ft ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            {ft === 'all' ? 'Todos' : ft === 'income' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
        <div className="w-px h-5 bg-border" />
        {(['all', 'business', 'personal'] as const).map(fo => (
          <button key={fo} onClick={() => setFilterOrigin(fo)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterOrigin === fo ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            {fo === 'all' ? 'Todos' : fo === 'business' ? 'Negócio' : 'Pessoal'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card w-44" />
        </div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">
            {['#', 'Data', 'Descrição', 'Categoria', 'Origem', 'Tipo', 'Valor', ''].map(h => (
              <th key={h} className={`px-3 py-2.5 label-upper text-muted ${h === 'Valor' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((tx, i) => (
                <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={`border-b border-border/50 hover:bg-secondary/50 transition-colors border-l-2 ${tx.type === 'income' ? 'border-l-fin-green' : 'border-l-fin-red'}`}>
                  <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium">{format(parseISO(tx.date), 'dd/MM/yy')}</td>
                  <td className="px-3 py-2.5">{tx.description}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold">{tx.category}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.origin === 'business' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-amber-pale text-fin-amber'}`}>{tx.origin === 'business' ? 'Negócio' : 'Pessoal'}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.type === 'income' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-red-pale text-fin-red'}`}>{tx.type === 'income' ? 'Receita' : 'Despesa'}</span></td>
                  <td className={`px-3 py-2.5 text-right metric-value ${tx.type === 'income' ? 'text-fin-green' : 'text-fin-red'}`}>{tx.type === 'expense' ? '−' : '+'}{formatCurrency(Number(tx.amount))}</td>
                  <td className="px-3 py-2.5"><button onClick={() => handleRemove(tx.id)} className="text-muted hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button></td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-fin-green-pale border-t border-border">
            <div><p className="label-upper text-muted">Total Receitas</p><p className="metric-value text-fin-green">{formatCurrency(totals.inc)}</p></div>
            <div><p className="label-upper text-muted">Total Despesas</p><p className="metric-value text-fin-red">{formatCurrency(totals.exp)}</p></div>
            <div><p className="label-upper text-muted">Saldo</p><p className={`metric-value ${totals.net >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{formatCurrency(totals.net)}</p></div>
          </div>
        )}
        {filtered.length === 0 && <p className="text-center text-sm text-muted py-8">Nenhum lançamento encontrado</p>}
      </div>
    </div>
  );
}

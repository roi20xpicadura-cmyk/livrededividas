import { useState, useMemo } from "react";
import { Investment, INVESTMENT_TYPES } from "@/types/findash";
import { format, parseISO } from "date-fns";
import { Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  investments: Investment[];
  currency: string;
  onAdd: (inv: Omit<Investment, 'id'>) => void;
  onUpdate: (id: string, p: Partial<Investment>) => void;
  onRemove: (id: string) => void;
}

function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#0891b2', '#dc2626', '#e11d48'];

export default function InvestmentsTab({ investments, currency, onAdd, onUpdate, onRemove }: Props) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [name, setName] = useState("");
  const [val, setVal] = useState("");
  const [cur, setCur] = useState("");
  const [type, setType] = useState(INVESTMENT_TYPES[0]);

  const totalInvested = investments.reduce((s, i) => s + i.val, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.cur, 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const pieData = useMemo(() => {
    const byType: Record<string, number> = {};
    investments.forEach(i => { byType[i.type] = (byType[i.type] || 0) + i.cur; });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [investments]);

  const handleAdd = () => {
    const v = parseFloat(val);
    const c = parseFloat(cur) || v;
    if (!name.trim() || isNaN(v) || v <= 0 || !date) return;
    onAdd({ date, name: name.trim(), val: v, cur: c, type });
    setName(""); setVal(""); setCur("");
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-4 bg-fin-green-pale">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Valor investido" value={val} onChange={e => setVal(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <input type="number" placeholder="Valor atual" value={cur} onChange={e => setCur(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card" />
          <select value={type} onChange={e => setType(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-card">
            {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={handleAdd} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all duration-200 col-span-2 md:col-span-2">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-surface p-4">
          <p className="label-upper text-muted">Total Investido</p>
          <p className="metric-value text-fin-blue text-lg">{fmt(totalInvested, currency)}</p>
        </div>
        <div className="card-surface p-4">
          <p className="label-upper text-muted">Valor Atual</p>
          <p className="metric-value text-fin-green text-lg">{fmt(totalCurrent, currency)}</p>
        </div>
        <div className="card-surface p-4">
          <p className="label-upper text-muted">Retorno</p>
          <p className={`metric-value text-lg ${totalReturn >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{fmt(totalReturn, currency)}</p>
        </div>
        <div className="card-surface p-4">
          <p className="label-upper text-muted">Retorno %</p>
          <p className={`metric-value text-lg ${returnPct >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{returnPct.toFixed(2)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="card-surface p-4">
            <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-2">Alocação por Tipo</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Investment List */}
        <div className="card-surface overflow-x-auto lg:col-span-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Data', 'Nome', 'Tipo', 'Investido', 'Atual', 'Retorno', ''].map(h => (
                  <th key={h} className={`px-3 py-2.5 label-upper text-muted ${['Investido', 'Atual', 'Retorno'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => {
                const ret = inv.cur - inv.val;
                return (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="px-3 py-2">{format(parseISO(inv.date), "dd/MM/yy")}</td>
                    <td className="px-3 py-2 font-medium">{inv.name}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-fin-purple-pale text-fin-purple text-[10px] font-bold">{inv.type}</span></td>
                    <td className="px-3 py-2 text-right metric-value">{fmt(inv.val, currency)}</td>
                    <td className="px-3 py-2 text-right metric-value text-fin-green">{fmt(inv.cur, currency)}</td>
                    <td className={`px-3 py-2 text-right metric-value flex items-center justify-end gap-1 ${ret >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>
                      {ret >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {fmt(ret, currency)}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => { if (confirm("Remover?")) onRemove(inv.id); }}
                        className="text-muted hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {investments.length === 0 && <p className="text-center text-sm text-muted py-8">Nenhum investimento</p>}
        </div>
      </div>
    </div>
  );
}

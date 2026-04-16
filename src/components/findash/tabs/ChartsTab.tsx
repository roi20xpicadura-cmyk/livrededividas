import { useMemo } from "react";
import { Transaction, Investment } from "@/types/kora";
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";

interface Props {
  filteredTx: Transaction[];
  investments: Investment[];
  currency: string;
  rangeStart: Date;
  rangeEnd: Date;
}

function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#0891b2', '#dc2626', '#e11d48', '#059669', '#6366f1'];

export default function ChartsTab({ filteredTx, investments, currency, rangeStart, rangeEnd }: Props) {
  // Income vs Expense by day
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      const dayTx = filteredTx.filter(t => t.date === key);
      return {
        date: format(d, "dd/MM", { locale: ptBR }),
        receitas: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.val, 0),
        despesas: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.val, 0),
      };
    }).filter(d => d.receitas > 0 || d.despesas > 0);
  }, [filteredTx, rangeStart, rangeEnd]);

  // Expenses by category
  const catData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTx.filter(t => t.type === 'expense').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.val; });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTx]);

  // Income by category
  const incCatData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTx.filter(t => t.type === 'income').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.val; });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTx]);

  // Business vs Personal
  const originData = useMemo(() => {
    const biz = filteredTx.filter(t => t.origin === 'business').reduce((s, t) => s + (t.type === 'income' ? t.val : -t.val), 0);
    const personal = filteredTx.filter(t => t.origin === 'personal').reduce((s, t) => s + (t.type === 'income' ? t.val : -t.val), 0);
    return [{ name: 'Negócio', value: Math.abs(biz) }, { name: 'Pessoal', value: Math.abs(personal) }];
  }, [filteredTx]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4">
          <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-3">Receitas vs Despesas</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 89%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v, currency)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-surface p-4">
          <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-3">Despesas por Categoria</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-surface p-4">
          <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-3">Receitas por Categoria</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incCatData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {incCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-surface p-4">
          <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-3">Negócio vs Pessoal</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={originData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#16a34a" />
                  <Cell fill="#d97706" />
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

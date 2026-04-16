import { useMemo } from "react";
import { Transaction, Investment } from "@/types/findash";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
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

const COLORS = ['#7C3AED', '#2563EB', '#7C3AED', '#D97706', '#0891B2', '#DC2626', '#E11D48', '#059669', '#6366F1'];

const axisStyle = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: 'var(--color-text-subtle)' },
};

const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-base)',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-md)',
    padding: '10px 14px',
    fontSize: '13px',
  },
  labelStyle: {
    color: 'var(--color-text-subtle)',
    fontWeight: '500' as const,
    marginBottom: '4px',
  },
};

export default function ChartsTab({ filteredTx, investments, currency, rangeStart, rangeEnd }: Props) {
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

  const catData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTx.filter(t => t.type === 'expense').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.val; });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTx]);

  const incCatData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTx.filter(t => t.type === 'income').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.val; });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTx]);

  const originData = useMemo(() => {
    const biz = filteredTx.filter(t => t.origin === 'business').reduce((s, t) => s + (t.type === 'income' ? t.val : -t.val), 0);
    const personal = filteredTx.filter(t => t.origin === 'personal').reduce((s, t) => s + (t.type === 'income' ? t.val : -t.val), 0);
    return [{ name: 'Negócio', value: Math.abs(biz) }, { name: 'Pessoal', value: Math.abs(personal) }];
  }, [filteredTx]);

  const chartCard = "card-surface p-5";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={chartCard}>
          <h3 className="section-title mb-4">Receitas vs Despesas</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barGap={2}>
                <XAxis dataKey="date" {...axisStyle} tickMargin={8} />
                <YAxis {...axisStyle} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} width={40} />
                <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
                <Bar dataKey="receitas" name="Receitas" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#E11D48" radius={[6, 6, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={chartCard}>
          <h3 className="section-title mb-4">Despesas por Categoria</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} dataKey="value" paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--color-text-subtle)', strokeWidth: 1 }}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={chartCard}>
          <h3 className="section-title mb-4">Receitas por Categoria</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incCatData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} dataKey="value" paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--color-text-subtle)', strokeWidth: 1 }}>
                  {incCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={chartCard}>
          <h3 className="section-title mb-4">Negócio vs Pessoal</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={originData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--color-text-subtle)', strokeWidth: 1 }}>
                  <Cell fill="#7C3AED" />
                  <Cell fill="#D97706" />
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

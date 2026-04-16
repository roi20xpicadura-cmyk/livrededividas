import { useMemo } from "react";
import { Transaction } from "@/types/findash";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { motion } from "framer-motion";

interface Props {
  filteredTx: Transaction[];
  currency: string;
  rangeStart: Date;
  rangeEnd: Date;
}

function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CashFlowTab({ filteredTx, currency, rangeStart, rangeEnd }: Props) {
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    let cumulative = 0;
    return days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      const dayTx = filteredTx.filter(t => t.date === key);
      const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.val, 0);
      const exp = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.val, 0);
      cumulative += inc - exp;
      return { date: format(d, "dd/MM", { locale: ptBR }), receitas: inc, despesas: exp, saldo: cumulative };
    });
  }, [filteredTx, rangeStart, rangeEnd]);

  const tableData = useMemo(() => {
    let cum = 0;
    return chartData.map(d => {
      return { ...d, acumulado: d.saldo };
    });
  }, [chartData]);

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4">
        <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-3">Fluxo de Caixa Acumulado</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 89%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v, currency)} labelStyle={{ fontWeight: 700 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="saldo" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45% / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Data', 'Receitas', 'Despesas', 'Saldo Acumulado'].map(h => (
                <th key={h} className={`px-4 py-2.5 label-upper text-muted ${h !== 'Data' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.filter(d => d.receitas > 0 || d.despesas > 0).map(d => (
              <tr key={d.date} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-2 font-medium">{d.date}</td>
                <td className="px-4 py-2 text-right text-fin-green metric-value">{fmt(d.receitas, currency)}</td>
                <td className="px-4 py-2 text-right text-fin-red metric-value">{fmt(d.despesas, currency)}</td>
                <td className={`px-4 py-2 text-right metric-value ${d.acumulado >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{fmt(d.acumulado, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

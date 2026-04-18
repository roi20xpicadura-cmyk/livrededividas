import { useMemo } from "react";
import { Transaction } from "@/types/findash";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
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
    fontWeight: '500',
    marginBottom: '4px',
  },
};

const axisStyle = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: 'var(--color-text-subtle)' },
};

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

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5">
        <h3 className="section-title mb-4">Fluxo de Caixa Acumulado</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 71% 37%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142 71% 37%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" {...axisStyle} tickMargin={8} />
              <YAxis {...axisStyle} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} width={40} />
              <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
              <ReferenceLine y={0} stroke="var(--color-border-base)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="saldo" stroke="hsl(142 71% 37%)" fill="url(#cashGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-bg-surface)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/40">
              {['Data', 'Receitas', 'Despesas', 'Saldo Acumulado'].map(h => (
                <th key={h} className={`px-5 py-3 label-upper ${h !== 'Data' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.filter(d => d.receitas > 0 || d.despesas > 0).map(d => (
              <tr key={d.date} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3 font-medium text-muted-foreground">{d.date}</td>
                <td className="px-5 py-3 text-right text-fin-green metric-value">{fmt(d.receitas, currency)}</td>
                <td className="px-5 py-3 text-right text-fin-red metric-value">{fmt(d.despesas, currency)}</td>
                <td className={`px-5 py-3 text-right metric-value ${d.saldo >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>{fmt(d.saldo, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

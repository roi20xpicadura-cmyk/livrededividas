import { Transaction } from "@/types/findash";
import { motion } from "framer-motion";
import { TrendingUp, Landmark, Percent, BarChart3, Receipt, CalendarDays, ArrowRight, Eye, EyeOff } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface Props {
  filteredTx: Transaction[];
  stats: {
    totalIncome: number; totalExpense: number; netBalance: number;
    bizIncome: number; bizExpense: number; personalExpense: number; bizProfit: number;
    patrimonio: number; savingsRate: number; roiBiz: number; avgPerDay: number;
    txCount: number;
  };
  currency: string;
  onGoToTransactions: () => void;
}

function fmt(val: number, currency: string) {
  return `${currency} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OverviewTab({ filteredTx, stats, currency, onGoToTransactions }: Props) {
  const recent = [...filteredTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const [visible, setVisible] = useState(true);

  const kpis = [
    { label: "Lucro Negócio", value: fmt(stats.bizProfit, currency), icon: TrendingUp, positive: stats.bizProfit >= 0 },
    { label: "Patrimônio Total", value: fmt(stats.patrimonio, currency), icon: Landmark, positive: true },
    { label: "Taxa de Poupança", value: `${stats.savingsRate.toFixed(1)}%`, icon: Percent, positive: stats.savingsRate > 0, bar: Math.min(stats.savingsRate, 100) },
    { label: "ROI Negócio", value: `${stats.roiBiz.toFixed(1)}%`, icon: BarChart3, positive: stats.roiBiz >= 0 },
    { label: "Lançamentos", value: stats.txCount.toString(), icon: Receipt, positive: true },
    { label: "Média/dia", value: fmt(stats.avgPerDay, currency), icon: CalendarDays, positive: stats.avgPerDay >= 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Hero Balance Card — dark premium */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{
          background: '#1A0D35',
        }}
      >
        {/* Subtle green glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(167, 139, 250,0.5) 0%, transparent 70%)' }} />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
              Saldo do Período
            </span>
            <button onClick={() => setVisible(!visible)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
              {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <p className={`font-mono text-[42px] font-extrabold tracking-[-0.04em] leading-none mb-6 ${stats.netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {visible ? fmt(stats.netBalance, currency) : '••••••'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Receitas", val: stats.totalIncome, color: "text-emerald-400" },
              { label: "Despesas", val: stats.totalExpense, color: "text-red-400" },
              { label: "Receita Negócio", val: stats.bizIncome, color: "text-emerald-400" },
              { label: "Gasto Pessoal", val: stats.personalExpense, color: "text-red-400" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40 mb-1">{s.label}</p>
                <p className={`font-mono text-lg font-bold tracking-tight ${s.color}`}>
                  {visible ? fmt(s.val, currency) : '••••'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card-surface p-5"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <k.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="label-upper mb-1">{k.label}</p>
            <p className="metric-value text-lg text-foreground">{visible ? k.value : '••••'}</p>
            {k.bar !== undefined && (
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${k.bar}%` }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="card-surface">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="section-title">Lançamentos Recentes</h3>
          <button onClick={onGoToTransactions} className="btn-ghost flex items-center gap-1.5 text-primary">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-t border-border/40">
                <th className="text-left px-5 py-3 label-upper">Data</th>
                <th className="text-left px-5 py-3 label-upper">Descrição</th>
                <th className="text-left px-5 py-3 label-upper">Categoria</th>
                <th className="text-left px-5 py-3 label-upper">Tipo</th>
                <th className="text-right px-5 py-3 label-upper">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">Nenhum lançamento no período</td></tr>
              ) : recent.map(tx => (
                <tr key={tx.id} className="border-t border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-muted-foreground">{format(parseISO(tx.date), "dd/MM", { locale: ptBR })}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{tx.desc}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground">{tx.cat}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${tx.type === 'income' ? 'bg-fin-green-pale text-fin-green' : 'bg-fin-red-pale text-fin-red'}`}>
                      {tx.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right metric-value ${tx.type === 'income' ? 'text-fin-green' : 'text-fin-red'}`}>
                    {tx.type === 'expense' ? '−' : '+'}{fmt(tx.val, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

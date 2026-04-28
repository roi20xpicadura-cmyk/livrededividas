import { useMemo, lazy, Suspense } from "react";
import { Transaction, Investment } from "@/types/findash";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

// Lazy-split: cada gráfico vira chunk separado, recharts só baixa quando esta página for aberta
const BarChartCard = lazy(() => import("../charts/BarChartCard"));
const PieChartCard = lazy(() => import("../charts/PieChartCard"));

interface Props {
  filteredTx: Transaction[];
  investments: Investment[];
  currency: string;
  rangeStart: Date;
  rangeEnd: Date;
}

const TOP_N = 6; // limita pizza (resto vira "Outros") — menos labels, render mais rápido

function topNWithOthers(entries: { name: string; value: number }[]) {
  if (entries.length <= TOP_N) return entries;
  const top = entries.slice(0, TOP_N - 1);
  const rest = entries.slice(TOP_N - 1).reduce((s, e) => s + e.value, 0);
  return rest > 0 ? [...top, { name: "Outros", value: rest }] : top;
}

function ChartSkeleton() {
  return (
    <div className="card-surface p-5">
      <div className="h-5 w-40 rounded bg-[var(--color-bg-subtle,#f3f4f6)] animate-pulse mb-4" />
      <div className="h-[260px] rounded bg-[var(--color-bg-subtle,#f3f4f6)] animate-pulse" />
    </div>
  );
}

export default function ChartsTab({ filteredTx, currency, rangeStart, rangeEnd }: Props) {
  // PASSADA ÚNICA pelos dados — antes eram 6+ filters por re-render
  const { dailyData, catData, incCatData, originData } = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const dayMap = new Map<string, { receitas: number; despesas: number }>();
    for (const d of days) dayMap.set(format(d, "yyyy-MM-dd"), { receitas: 0, despesas: 0 });

    const expenseCats: Record<string, number> = {};
    const incomeCats: Record<string, number> = {};
    let bizSum = 0;
    let personalSum = 0;

    for (const t of filteredTx) {
      const isIncome = t.type === 'income';
      const v = t.val;

      // diário
      const slot = dayMap.get(t.date);
      if (slot) {
        if (isIncome) slot.receitas += v;
        else slot.despesas += v;
      }

      // categoria
      if (isIncome) incomeCats[t.cat] = (incomeCats[t.cat] || 0) + v;
      else expenseCats[t.cat] = (expenseCats[t.cat] || 0) + v;

      // origem
      const signed = isIncome ? v : -v;
      if (t.origin === 'business') bizSum += signed;
      else if (t.origin === 'personal') personalSum += signed;
    }

    const dailyData = Array.from(dayMap.entries())
      .filter(([, v]) => v.receitas > 0 || v.despesas > 0)
      .map(([k, v]) => ({
        date: format(new Date(k + 'T00:00:00'), "dd/MM", { locale: ptBR }),
        receitas: v.receitas,
        despesas: v.despesas,
      }));

    const catData = topNWithOthers(
      Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    );
    const incCatData = topNWithOthers(
      Object.entries(incomeCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    );
    const originData = [
      { name: 'Negócio', value: Math.abs(bizSum) },
      { name: 'Pessoal', value: Math.abs(personalSum) },
    ];

    return { dailyData, catData, incCatData, originData };
  }, [filteredTx, rangeStart, rangeEnd]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Suspense fallback={<ChartSkeleton />}>
            <BarChartCard title="Receitas vs Despesas" data={dailyData} currency={currency} />
          </Suspense>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Suspense fallback={<ChartSkeleton />}>
            <PieChartCard title="Despesas por Categoria" data={catData} currency={currency} />
          </Suspense>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Suspense fallback={<ChartSkeleton />}>
            <PieChartCard title="Receitas por Categoria" data={incCatData} currency={currency} />
          </Suspense>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Suspense fallback={<ChartSkeleton />}>
            <PieChartCard title="Negócio vs Pessoal" data={originData} currency={currency} colors={['#7C3AED', '#D97706']} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}

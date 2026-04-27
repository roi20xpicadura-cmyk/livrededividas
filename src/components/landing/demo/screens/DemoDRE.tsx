import { motion } from 'framer-motion';
import { formatBRL, getCategoryBreakdown, getMonthSummary, useDemoStore } from '../demoStore';

export default function DemoDRE() {
  const state = useDemoStore((s) => s);
  const { income, expenses, balance } = getMonthSummary(state);
  const margin = income > 0 ? (balance / income) * 100 : 0;
  const breakdown = getCategoryBreakdown(state);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] md:text-[22px] font-[800] text-[#1A0D35]">DRE — este mês</h2>
        <p className="text-[12px] md:text-[13px] text-[#7B6A9B]">Demonstrativo de resultados</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPI label="Receita" value={income} accent="green" />
        <KPI label="Despesas" value={expenses} accent="red" />
        <KPI label="Resultado" value={balance} accent={balance >= 0 ? 'brand' : 'red'} />
      </div>

      {/* DRE table */}
      <div className="rounded-[16px] bg-white border border-[rgba(124,58,237,0.12)] overflow-hidden">
        <Row label="(+) Receita bruta" value={income} bold />
        <Row label="(−) Despesas operacionais" value={-expenses} sub />
        {breakdown.slice(0, 6).map((b) => (
          <Row key={b.category} label={`     ${b.category}`} value={-b.value} dim />
        ))}
        <Row label="(=) Resultado líquido" value={balance} bold highlight />
        <div className="flex items-center justify-between px-4 py-3 bg-[#F5F3FF]">
          <span className="text-[12px] uppercase tracking-wider font-bold text-[#7C3AED]">Margem</span>
          <span className="text-[14px] font-[900] text-[#7C3AED] tabular-nums">{margin.toFixed(1)}%</span>
        </div>
      </div>

      <div className="rounded-[16px] p-4 bg-gradient-to-br from-[#F5F3FF] to-white border border-[rgba(124,58,237,0.18)]">
        <div className="text-[11px] uppercase tracking-wider font-bold text-[#7C3AED] mb-1">📊 Análise</div>
        <p className="text-[13px] text-[#1A0D35] leading-snug">
          Sua margem de <strong>{margin.toFixed(1)}%</strong> está {margin > 30 ? 'ótima' : margin > 10 ? 'saudável' : 'apertada'}. {margin < 30 && 'Quer ver onde cortar para subir 5 pontos?'}
        </p>
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: number; accent: 'green' | 'red' | 'brand' }) {
  const color = accent === 'green' ? '#16A34A' : accent === 'red' ? '#DC2626' : '#7C3AED';
  const bg = accent === 'green' ? '#F0FDF4' : accent === 'red' ? '#FEF2F2' : '#F5F3FF';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[16px] p-4 border border-[rgba(124,58,237,0.12)]"
      style={{ background: bg }}
    >
      <div className="text-[10.5px] uppercase tracking-wider font-bold" style={{ color }}>{label}</div>
      <div className="mt-1 text-[18px] md:text-[22px] font-[900] tabular-nums" style={{ color }}>
        {formatBRL(value)}
      </div>
    </motion.div>
  );
}

function Row({ label, value, bold, sub, dim, highlight }: { label: string; value: number; bold?: boolean; sub?: boolean; dim?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-[#F0EEFF] last:border-b-0 ${highlight ? 'bg-[#FAFAFE]' : ''}`}>
      <span className={`text-[12.5px] ${bold ? 'font-[800] text-[#1A0D35]' : sub ? 'font-bold text-[#2A1A4F]' : dim ? 'text-[#7B6A9B]' : 'text-[#2A1A4F]'} whitespace-pre`}>
        {label}
      </span>
      <span className={`text-[12.5px] font-[800] tabular-nums ${value < 0 ? 'text-[#DC2626]' : value > 0 ? 'text-[#16A34A]' : 'text-[#1A0D35]'}`}>
        {formatBRL(value)}
      </span>
    </div>
  );
}

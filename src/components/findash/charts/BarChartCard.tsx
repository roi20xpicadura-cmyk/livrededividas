import { memo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { axisStyle, tooltipStyle, fmt, fmtCompact } from "./_shared";

interface Props {
  title: string;
  data: { date: string; receitas: number; despesas: number }[];
  currency: string;
}

function BarChartCard({ title, data, currency }: Props) {
  // Se houver muitos dias, usa Area (linhas com gradient) pra ficar mais limpo no mobile
  const useArea = data.length > 10;
  const totalReceitas = data.reduce((s, d) => s + d.receitas, 0);
  const totalDespesas = data.reduce((s, d) => s + d.despesas, 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #F0EEF8',
        borderRadius: 20,
        padding: 18,
        boxShadow: '0 4px 20px -8px rgba(124,58,237,0.12), 0 2px 6px -2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-bold text-[15px] leading-tight" style={{ color: '#1A0D35' }}>{title}</h3>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Pill color="#7C3AED" label="Receitas" value={fmt(totalReceitas, currency)} />
            <Pill color="#EC4899" label="Despesas" value={fmt(totalDespesas, currency)} />
          </div>
        </div>
        <div
          className="text-right flex-shrink-0"
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            background: saldo >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: saldo >= 0 ? '#059669' : '#DC2626' }}>
            Saldo
          </p>
          <p className="font-extrabold text-[14px] leading-none mt-1"
            style={{ color: saldo >= 0 ? '#059669' : '#DC2626' }}>
            {fmt(saldo, currency)}
          </p>
        </div>
      </div>

      <div className="h-[240px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          {useArea ? (
            <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-rec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-desp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" {...axisStyle} tickMargin={8} interval="preserveStartEnd" minTickGap={20} />
              <YAxis {...axisStyle} tickFormatter={fmtCompact} width={36} />
              <Tooltip
                formatter={(v: number, n) => [fmt(v, currency), n === 'receitas' ? 'Receitas' : 'Despesas']}
                {...tooltipStyle}
              />
              <Area type="monotone" dataKey="receitas" stroke="#7C3AED" strokeWidth={2.5} fill="url(#grad-rec)" isAnimationActive={false} />
              <Area type="monotone" dataKey="despesas" stroke="#EC4899" strokeWidth={2.5} fill="url(#grad-desp)" isAnimationActive={false} />
            </AreaChart>
          ) : (
            <BarChart data={data} barGap={4} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" {...axisStyle} tickMargin={8} />
              <YAxis {...axisStyle} tickFormatter={fmtCompact} width={36} />
              <Tooltip
                formatter={(v: number, n) => [fmt(v, currency), n === 'receitas' ? 'Receitas' : 'Despesas']}
                {...tooltipStyle}
              />
              <Bar dataKey="receitas" name="receitas" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="despesas" name="despesas" fill="#EC4899" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Pill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="inline-block flex-shrink-0" style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>{label}</span>
      <span className="text-[11.5px] font-bold truncate" style={{ color: '#1A0D35' }}>{value}</span>
    </div>
  );
}

export default memo(BarChartCard);

import { memo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { axisStyle, tooltipStyle, fmt } from "./_shared";

interface Props {
  title: string;
  data: { date: string; receitas: number; despesas: number }[];
  currency: string;
}

function BarChartCard({ title, data, currency }: Props) {
  return (
    <div className="card-surface p-5">
      <h3 className="section-title mb-4">{title}</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis dataKey="date" {...axisStyle} tickMargin={8} />
            <YAxis {...axisStyle} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} width={40} />
            <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
            <Bar dataKey="receitas" name="Receitas" fill="#7C3AED" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="despesas" name="Despesas" fill="#E11D48" radius={[6, 6, 0, 0]} opacity={0.85} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(BarChartCard);

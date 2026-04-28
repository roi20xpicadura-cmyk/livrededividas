import { memo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS, tooltipStyle, fmt } from "./_shared";

interface Props {
  title: string;
  data: { name: string; value: number }[];
  currency: string;
  colors?: string[];
}

function PieChartCard({ title, data, currency, colors = COLORS }: Props) {
  return (
    <div className="card-surface p-5">
      <h3 className="section-title mb-4">{title}</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={50}
              dataKey="value"
              paddingAngle={2}
              isAnimationActive={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: 'var(--color-text-subtle)', strokeWidth: 1 }}
            >
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v, currency)} {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(PieChartCard);

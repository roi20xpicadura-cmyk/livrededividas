import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 29.9,
  premium: 49.9,
};

interface MonthPoint {
  month: string;
  label: string;
  mrr: number;
  paying: number;
}

export default function MRRChart() {
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 12 meses pra trás
      const start = new Date();
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("plan, plan_expires_at, created_at");

      const months: MonthPoint[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

        let mrr = 0;
        let paying = 0;
        (profiles || []).forEach((p: any) => {
          const created = new Date(p.created_at);
          if (created > monthEnd) return; // ainda não existia
          const plan = p.plan || "free";
          const price = PLAN_PRICES[plan] || 0;
          if (price > 0) {
            // se tem expires e já expirou antes desse mês, ignora
            if (p.plan_expires_at && new Date(p.plan_expires_at) < d) return;
            mrr += price;
            paying++;
          }
        });

        months.push({
          month: key,
          label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          mrr: Math.round(mrr * 100) / 100,
          paying,
        });
      }
      setData(months);
      setLoading(false);
    })();
  }, []);

  const currentMRR = data[data.length - 1]?.mrr || 0;
  const prevMRR = data[data.length - 2]?.mrr || 0;
  const growth = prevMRR > 0 ? ((currentMRR - prevMRR) / prevMRR) * 100 : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold">MRR ao longo do tempo</h2>
          <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            R$ {currentMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-xs font-medium ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
            {growth >= 0 ? "▲" : "▼"} {Math.abs(growth).toFixed(1)}% vs mês anterior
          </div>
        </div>
      </div>
      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) =>
                  name === "mrr"
                    ? [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "MRR"]
                    : [value, "Pagantes"]
                }
              />
              <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

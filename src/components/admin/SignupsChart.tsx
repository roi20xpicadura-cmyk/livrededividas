import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DayPoint {
  date: string;
  label: string;
  count: number;
}

export default function SignupsChart() {
  const [data, setData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      since.setHours(0, 0, 0, 0);
      const { data: rows } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since.toISOString());

      const buckets = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }
      (rows || []).forEach((r: { created_at: string | null }) => {
        if (!r.created_at) return;
        const key = r.created_at.slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
      });
      const points: DayPoint[] = Array.from(buckets.entries()).map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        count,
      }));
      setData(points);
      setLoading(false);
    })();
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold">Cadastros por dia</h2>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">novos usuários</div>
        </div>
      </div>
      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#signupsGrad)" name="Cadastros" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

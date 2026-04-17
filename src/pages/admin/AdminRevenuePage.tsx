import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 19.9,
  premium: 49.9,
};

export default function AdminRevenuePage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("profiles").select("plan").then(({ data }) => {
      const c: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const p = r.plan || "free";
        c[p] = (c[p] || 0) + 1;
      });
      setCounts(c);
    });
  }, []);

  const mrr = Object.entries(counts).reduce((sum, [plan, n]) => sum + n * (PLAN_PRICES[plan] || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Receita</h1>

      <Card className="p-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">MRR estimado</div>
        <div className="text-4xl font-bold mt-2">
          R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PLAN_PRICES).map(([plan, price]) => (
          <Card key={plan} className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{plan}</div>
            <div className="text-2xl font-bold mt-1">{counts[plan] || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              R$ {price.toFixed(2)}/mês
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

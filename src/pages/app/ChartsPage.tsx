import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ChartsTab from "@/components/findash/tabs/ChartsTab";
import type { Transaction } from "@/types/findash";

export default function ChartsPage() {
  const { user } = useAuth();
  const [tx, setTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Período: mês atual (igual ao default da Overview)
  const [rangeStart, rangeEnd] = useMemo(() => {
    const now = new Date();
    return [startOfMonth(now), endOfMonth(now)];
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, amount, type, origin, category")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("date", format(rangeStart, "yyyy-MM-dd"))
        .lte("date", format(rangeEnd, "yyyy-MM-dd"))
        .order("date", { ascending: true })
        .limit(2000);

      if (cancelled) return;
      if (error || !data) {
        setTx([]);
      } else {
        setTx(
          data.map((r) => ({
            id: r.id,
            date: r.date,
            desc: r.description ?? "",
            val: Number(r.amount) || 0,
            type: (r.type === "income" ? "income" : "expense") as Transaction["type"],
            origin: (r.origin === "business" ? "business" : "personal") as Transaction["origin"],
            cat: r.category ?? "Outro",
          }))
        );
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, rangeStart, rangeEnd]);

  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-surface p-5">
              <div className="h-5 w-40 rounded bg-[var(--color-bg-subtle,#f3f4f6)] animate-pulse mb-4" />
              <div className="h-[260px] rounded bg-[var(--color-bg-subtle,#f3f4f6)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tx.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-20">
        <div
          className="flex items-center justify-center mb-5"
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "var(--color-violet-50, #F5F3FF)",
            color: "var(--color-violet-600, #7C3AED)",
          }}
        >
          <BarChart3 size={32} strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold mb-1.5" style={{ color: "var(--color-text-strong, #1A0D35)" }}>
          Sem dados para exibir
        </h2>
        <p className="text-sm max-w-sm" style={{ color: "var(--color-text-muted, #6B7280)" }}>
          Adicione transações no mês atual para ver seus gráficos aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartsTab
        filteredTx={tx}
        investments={[]}
        currency="R$"
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />
    </div>
  );
}

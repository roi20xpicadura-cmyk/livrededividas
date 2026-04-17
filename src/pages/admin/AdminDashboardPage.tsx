import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Activity, MessageCircle, ArrowUpRight, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SignupsChart from "@/components/admin/SignupsChart";
import MRRChart from "@/components/admin/MRRChart";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  waConnections: number;
  monthlyTxs: number;
  newToday: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentUser[]>([]);

  useEffect(() => {
    loadStats();
    loadRecent();
  }, []);

  async function loadStats() {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split("T")[0];
    const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [users, activeUsers, waConnections, transactions, newToday] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("transactions").select("user_id").gte("date", last7),
      supabase.from("whatsapp_connections").select("id", { count: "exact", head: true }).eq("verified", true),
      supabase.from("transactions").select("id", { count: "exact", head: true }).gte("date", thisMonth),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today),
    ]);

    const uniqueActive = new Set(activeUsers.data?.map((t: any) => t.user_id)).size;

    setStats({
      totalUsers: users.count || 0,
      activeUsers: uniqueActive,
      waConnections: waConnections.count || 0,
      monthlyTxs: transactions.count || 0,
      newToday: newToday.count || 0,
    });
  }

  async function loadRecent() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent(data || []);
  }

  const kpis = [
    { label: "Total de usuários", value: stats?.totalUsers, icon: Users, color: "text-primary" },
    { label: "Ativos (7 dias)", value: stats?.activeUsers, icon: Activity, color: "text-green-500" },
    { label: "WhatsApp conectado", value: stats?.waConnections, icon: MessageCircle, color: "text-emerald-500" },
    { label: "Lançamentos no mês", value: stats?.monthlyTxs, icon: ArrowUpRight, color: "text-amber-500" },
    { label: "Novos hoje", value: stats?.newToday, icon: Sparkles, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5">
              <Icon className={`h-5 w-5 mb-3 ${kpi.color}`} />
              <div className="text-2xl font-bold">
                {stats ? (kpi.value ?? 0).toLocaleString("pt-BR") : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SignupsChart />
        <MRRChart />
      </div>

      <Card className="p-5">
        <h2 className="text-base font-bold mb-4">Cadastros recentes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "Sem nome"}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
            {recent.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                  Nenhum cadastro ainda
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  full_name: string | null;
  created_at: string;
  plan?: string | null;
  whatsapp?: { phone_number: string; verified: boolean; active: boolean; last_message_at: string | null } | null;
  config?: { profile_type: string | null; financial_score: number | null } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const [profilesRes, waRes, cfgRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, created_at, plan")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("whatsapp_connections")
          .select("user_id, phone_number, verified, active, last_message_at"),
        supabase
          .from("user_config")
          .select("user_id, profile_type, financial_score"),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const waMap = new Map((waRes.data || []).map((w: any) => [w.user_id, w]));
      const cfgMap = new Map((cfgRes.data || []).map((c: any) => [c.user_id, c]));

      const merged: AdminUser[] = (profilesRes.data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        created_at: p.created_at,
        plan: p.plan,
        whatsapp: waMap.get(p.id) || null,
        config: cfgMap.get(p.id) || null,
      }));

      setUsers(merged);
    } catch (e: any) {
      console.error("Erro ao carregar usuários:", e);
      toast.error("Erro ao carregar usuários: " + (e.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function sendTestNotification(phone?: string) {
    if (!phone) {
      toast.error("Usuário sem WhatsApp conectado");
      return;
    }
    const { error } = await supabase.functions.invoke("send-zapi-message", {
      body: { phone, message: "🐨 Olá! Esta é uma notificação de teste do KoraFinance." },
    });
    if (error) toast.error("Falha ao enviar"); else toast.success("Mensagem enviada");
  }

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Usuários ({users.length})</h1>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuário..."
          className="max-w-xs"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!loading && filtered.map((u) => {
              const wa = u.whatsapp;
              const cfg = u.config;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "Sem nome"}</TableCell>
                  <TableCell>
                    <Badge variant={u.plan && u.plan !== "free" ? "default" : "outline"}>
                      {u.plan || "free"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cfg?.profile_type || "personal"}</Badge>
                  </TableCell>
                  <TableCell>
                    {wa?.verified ? (
                      <span className="text-green-600 dark:text-green-500 text-xs font-medium">✓ {wa.phone_number}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Não conectado</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{cfg?.financial_score ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!wa?.verified}
                      onClick={() => sendTestNotification(wa?.phone_number)}
                    >
                      <Send className="h-3 w-3 mr-1" /> Notificar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

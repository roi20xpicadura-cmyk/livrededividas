import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WAMessage {
  id: string;
  role: string | null;
  direction: string;
  phone: string | null;
  phone_number: string;
  content: string | null;
  message: string;
  created_at: string | null;
}

export default function AdminWhatsAppPage() {
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [broadcast, setBroadcast] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setMessages((data as unknown as WAMessage[]) || []));
  }, []);

  async function sendBroadcast() {
    if (!broadcast.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-whatsapp-broadcast", {
      body: { message: broadcast },
    });
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar broadcast");
      return;
    }
    toast.success(`Broadcast enviado para ${data?.sent ?? 0} usuários`);
    setBroadcast("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp</h1>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-4 w-4 text-primary" />
          <h2 className="font-bold">Enviar para todos</h2>
        </div>
        <Textarea
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
          placeholder="Digite a mensagem para todos os usuários com WhatsApp conectado..."
          rows={4}
          className="mb-3"
        />
        <Button onClick={sendBroadcast} disabled={!broadcast.trim() || sending}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
          {sending ? "Enviando…" : "Enviar broadcast"}
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Mensagens recentes</h2>
        <div className="space-y-2">
          {messages.map((msg) => {
            const isUser = (msg.role || msg.direction) === "user" || msg.direction === "inbound";
            return (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border-l-2 ${
                  isUser ? "bg-muted/40 border-muted-foreground/30" : "bg-primary/5 border-primary"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isUser ? "text-muted-foreground" : "text-primary"}`}>
                    {isUser ? "👤 Usuário" : "🐨 Kora IA"} · {msg.phone || msg.phone_number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {msg.created_at && new Date(msg.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="text-sm">{msg.content || msg.message}</div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma mensagem ainda</p>
          )}
        </div>
      </Card>
    </div>
  );
}

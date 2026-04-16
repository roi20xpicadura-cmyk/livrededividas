import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") || "";
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN") || "";
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalizeBrazilPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

type SendResult = { success: true } | { success: false; error: string };

async function sendZapiText(phone: string, message: string): Promise<SendResult> {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
    return { success: false, error: "Z-API não configurada no backend." };
  }
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({ phone, message }),
      },
    );
    if (!res.ok) {
      const errBody = await res.text();
      console.error("Z-API send error:", res.status, errBody);
      return { success: false, error: `Z-API recusou a mensagem (${res.status}).` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro de rede Z-API." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { userId, phoneNumber, action, code } = await req.json();
    if (!userId || !action) return respond({ error: "Missing required fields" }, 400);

    if (action === "send_code") {
      if (!phoneNumber) return respond({ error: "Phone number required" }, 400);
      const cleanPhone = normalizeBrazilPhone(phoneNumber);
      if (cleanPhone.length < 12 || cleanPhone.length > 13) {
        return respond({ error: "Número inválido. Use DDD + número." }, 400);
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: upsertError } = await supabase.from("whatsapp_connections").upsert(
        {
          user_id: userId,
          phone_number: cleanPhone,
          verified: false,
          verification_code: verificationCode,
          verification_expires_at: expiresAt,
          active: true,
        },
        { onConflict: "user_id" },
      );
      if (upsertError) return respond({ error: "Erro ao salvar conexão do WhatsApp." }, 500);

      const sendResult = await sendZapiText(
        cleanPhone,
        `🔐 *KoraFinance — Verificação*\n\nSeu código: *${verificationCode}*\n\nVálido por 10 minutos.`,
      );
      if (!sendResult.success) return respond({ error: sendResult.error }, 502);

      return respond({ sent: true, phone_number: cleanPhone, mode: "zapi" });
    }

    if (action === "verify_code") {
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!conn) return respond({ error: "Conexão não encontrada" }, 404);
      if (new Date() > new Date(conn.verification_expires_at)) {
        return respond({ error: "Código expirado. Solicite um novo." }, 400);
      }
      if (conn.verification_code !== code) return respond({ error: "Código incorreto" }, 400);

      const { error: verifyError } = await supabase
        .from("whatsapp_connections")
        .update({ verified: true, connected_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (verifyError) return respond({ error: "Erro ao confirmar conexão." }, 500);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      const name = profile?.full_name?.split(" ")[0] || "você";

      const welcomeResult = await sendZapiText(
        conn.phone_number,
        `✅ *WhatsApp conectado ao KoraFinance!* 🐨\n\nOlá, ${name}! Agora gerencie finanças por aqui.\n\n*Exemplos:*\n💸 "gastei 50 no mercado"\n💰 "recebi 3000 de salário"\n📷 Foto do cupom fiscal\n📊 "como estão minhas finanças?"\n\nPode começar! 🚀`,
      );

      if (!welcomeResult.success) return respond({ verified: true, warning: welcomeResult.error });
      return respond({ verified: true });
    }

    if (action === "disconnect") {
      await supabase
        .from("whatsapp_connections")
        .update({ active: false, verified: false })
        .eq("user_id", userId);
      return respond({ disconnected: true });
    }

    if (action === "status") {
      const { data } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("verified", true)
        .eq("active", true)
        .maybeSingle();
      return respond({ connection: data || null, mode: "zapi" });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("Verify error:", error);
    return respond({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

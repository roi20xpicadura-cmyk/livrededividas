import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

/** Detect mode: if TWILIO_WHATSAPP_NUMBER is set and not the sandbox number, we're in production */
function getWhatsAppConfig() {
  const configuredNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";
  const SANDBOX_NUMBER = "+14155238886";
  const isProduction = configuredNumber !== "" && configuredNumber !== SANDBOX_NUMBER;
  const fromNumber = isProduction ? configuredNumber : SANDBOX_NUMBER;
  return { isProduction, fromNumber };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { userId, phoneNumber, action, code } = await req.json();

    if (!userId || !action) {
      return respond({ error: "Missing required fields" }, 400);
    }

    const config = getWhatsAppConfig();

    if (action === "send_code") {
      if (!phoneNumber) {
        return respond({ error: "Phone number required" }, 400);
      }

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
        { onConflict: "user_id" }
      );

      if (upsertError) {
        return respond({ error: "Erro ao salvar conexão do WhatsApp." }, 500);
      }

      let sendResult: SendResult;

      if (config.isProduction) {
        // Production: use approved Content Template for verification
        sendResult = await sendWhatsAppTemplate(
          cleanPhone,
          config.fromNumber,
          "findash_verification_code", // Template SID or name
          { "1": verificationCode }
        );
      } else {
        // Sandbox: send plain text
        sendResult = await sendWhatsApp(
          cleanPhone,
          config.fromNumber,
          `🔐 *FinDash Pro — Verificação*\n\nSeu código: *${verificationCode}*\n\nVálido por 10 minutos.`
        );
      }

      if (!sendResult.success) {
        return respond({ error: sendResult.error }, 502);
      }

      return respond({ sent: true, phone_number: cleanPhone, mode: config.isProduction ? "production" : "sandbox" });
    }

    if (action === "verify_code") {
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!conn) {
        return respond({ error: "Conexão não encontrada" }, 404);
      }

      if (new Date() > new Date(conn.verification_expires_at)) {
        return respond({ error: "Código expirado. Solicite um novo." }, 400);
      }

      if (conn.verification_code !== code) {
        return respond({ error: "Código incorreto" }, 400);
      }

      const { error: verifyError } = await supabase.from("whatsapp_connections")
        .update({ verified: true, connected_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (verifyError) {
        return respond({ error: "Erro ao confirmar conexão." }, 500);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      const name = profile?.full_name?.split(" ")[0] || "você";

      // Welcome message (template in production, plain text in sandbox)
      let welcomeResult: SendResult;
      if (config.isProduction) {
        welcomeResult = await sendWhatsAppTemplate(
          conn.phone_number,
          config.fromNumber,
          "findash_welcome",
          { "1": name }
        );
      } else {
        welcomeResult = await sendWhatsApp(
          conn.phone_number,
          config.fromNumber,
          `✅ *WhatsApp conectado ao FinDash Pro!*\n\nOlá, ${name}! Agora gerencie finanças por aqui.\n\n*Exemplos:*\n💸 "gastei 50 no mercado"\n💰 "recebi 3000 de salário"\n📊 "como estão minhas finanças?"\n🎯 "progresso da minha meta"\n\nPode começar! 🚀`
        );
      }

      if (!welcomeResult.success) {
        return respond({ verified: true, warning: welcomeResult.error });
      }

      return respond({ verified: true });
    }

    if (action === "disconnect") {
      await supabase.from("whatsapp_connections")
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
        .single();

      return respond({
        connection: data || null,
        mode: config.isProduction ? "production" : "sandbox",
      });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("Verify error:", error);
    return respond({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

// ━━━ TYPES ━━━
type SendResult = { success: true } | { success: false; error: string };

// ━━━ SEND PLAIN TEXT (sandbox + session replies) ━━━
async function sendWhatsApp(to: string, from: string, message: string): Promise<SendResult> {
  const { LOVABLE_API_KEY, TWILIO_API_KEY } = getGatewayKeys();
  if (!LOVABLE_API_KEY) return { success: false, error: "Configuração ausente do backend (LOVABLE_API_KEY)." };
  if (!TWILIO_API_KEY) return { success: false, error: "Configuração ausente do Twilio no projeto." };

  const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:+${from.replace(/\D/g, "")}`,
      To: `whatsapp:+${to}`,
      Body: message,
    }).toString(),
  });

  return handleTwilioResponse(resp);
}

// ━━━ SEND TEMPLATE (production - outbound initiation) ━━━
async function sendWhatsAppTemplate(
  to: string,
  from: string,
  contentSid: string,
  variables: Record<string, string>
): Promise<SendResult> {
  const { LOVABLE_API_KEY, TWILIO_API_KEY } = getGatewayKeys();
  if (!LOVABLE_API_KEY) return { success: false, error: "Configuração ausente do backend (LOVABLE_API_KEY)." };
  if (!TWILIO_API_KEY) return { success: false, error: "Configuração ausente do Twilio no projeto." };

  const params: Record<string, string> = {
    From: `whatsapp:+${from.replace(/\D/g, "")}`,
    To: `whatsapp:+${to}`,
    ContentSid: contentSid,
  };

  // Add template variables (ContentVariables is JSON)
  if (Object.keys(variables).length > 0) {
    params.ContentVariables = JSON.stringify(variables);
  }

  const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });

  return handleTwilioResponse(resp);
}

// ━━━ HELPERS ━━━
function getGatewayKeys() {
  return {
    LOVABLE_API_KEY: Deno.env.get("LOVABLE_API_KEY"),
    TWILIO_API_KEY: Deno.env.get("TWILIO_API_KEY"),
  };
}

async function handleTwilioResponse(resp: Response): Promise<SendResult> {
  const payload = await resp.json().catch(() => null);

  if (!resp.ok) {
    return {
      success: false,
      error: payload?.message || payload?.error_message || `Falha ao enviar WhatsApp (${resp.status}).`,
    };
  }

  if (payload?.error_code || payload?.error_message) {
    return {
      success: false,
      error: payload.error_message || `Twilio recusou a mensagem (${payload.error_code}).`,
    };
  }

  return { success: true };
}

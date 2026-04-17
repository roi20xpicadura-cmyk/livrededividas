import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── SEND TEXT VIA Z-API ───────────────────────────
async function sendMessage(phone: string, text: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone, message: text }),
  });
  if (!res.ok) console.error("Z-API send-text error:", res.status, await res.text());
}

// ─── DOWNLOAD IMAGE FROM Z-API ─────────────────────
async function downloadImage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: { "Client-Token": ZAPI_CLIENT_TOKEN },
  });
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ─── CLAUDE — TEXT ─────────────────────────────────
async function processText(message: string, _context: any) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Você é a Kora IA do KoraFinance, assistente financeira.
Analise a mensagem e responda APENAS com JSON puro, sem texto adicional, sem markdown, sem explicações, sem blocos de código.

EXEMPLOS de transações:
- "gastei 50 no mercado" → despesa R$50
- "gastei 50 reais no mercado" → despesa R$50
- "paguei 120 de luz" → despesa R$120
- "comprei remédio por 35" → despesa R$35
- "recebi 3000 de salário" → receita R$3000
- "vendi produto por 200" → receita R$200

Se for transação, retorne EXATAMENTE este JSON:
{"is_transaction":true,"type":"expense","amount":50,"description":"Supermercado","category":"Supermercado","reply":"💸 Despesa de R$ 50,00 registrada!"}

Se for pergunta ou conversa, retorne EXATAMENTE este JSON:
{"is_transaction":false,"reply":"sua resposta aqui"}

IMPORTANTE:
- Retorne APENAS o JSON, nada mais
- Sem aspas extras, sem markdown, sem \`\`\`json
- amount deve ser um número, não string
- type deve ser "expense" para gastos e "income" para receitas`,
      messages: [
        { role: "user", content: message },
        { role: "assistant", content: "{" },
      ],
    }),
  });

  const data = await response.json();
  let text = data.content?.[0]?.text || "";
  text = "{" + text;
  console.log("Claude raw response:", text);

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        console.error("JSON parse failed:", text);
      }
    }

    const lower = message.toLowerCase();
    const hasExpense = /gast|pagu|comprei|compra|mercado|uber|ifood|farm[áa]cia|combust[íi]vel/.test(lower);
    const hasIncome = /receb|sal[áa]rio|vendi|venda|receita/.test(lower);
    const amountMatch = message.match(/\d+([.,]\d{1,2})?/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(",", ".")) : 0;

    if (amount > 0 && (hasExpense || hasIncome)) {
      return {
        is_transaction: true,
        type: hasIncome ? "income" : "expense",
        amount,
        description: message.slice(0, 50),
        category: "Outros",
        reply: `${hasIncome ? "💰 Receita" : "💸 Despesa"} de R$ ${amount.toFixed(2).replace(".", ",")} registrada!`,
      };
    }

    return {
      is_transaction: false,
      reply: 'Não entendi. Pode descrever o gasto assim: "gastei 50 no mercado"?',
    };
  }
}

// ─── CLAUDE — VISION ───────────────────────────────
async function processImage(imageBase64: string, mimeType: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `Você é a Kora IA do KoraFinance.
Analise a imagem enviada pelo usuário.
Pode ser: cupom fiscal, nota fiscal, comprovante de pagamento, extrato bancário, boleto ou print de transação.

Extraia as informações financeiras e responda em JSON:
{
  "is_transaction": true/false,
  "transactions": [
    { "type": "expense" ou "income", "amount": número, "description": "descrição do item/compra", "category": "categoria" }
  ],
  "total": número total,
  "establishment": "nome do estabelecimento se visível",
  "date": "data se visível",
  "reply": "confirmação amigável listando o que foi encontrado"
}

Se não conseguir extrair dados financeiros:
{ "is_transaction": false, "reply": "Não consegui identificar dados financeiros nesta imagem. Pode descrever o gasto em texto?" }`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: "Analise esta imagem e extraia os dados financeiros." },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { is_transaction: false, reply: "Não consegui ler a imagem. Tente descrever o gasto em texto." };
  }
}

// ─── USER LOOKUP ───────────────────────────────────
async function getUserByPhone(phone: string) {
  const clean = phone.replace(/\D/g, "");
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("user_id")
    .or(`phone_number.eq.${clean},phone_number.eq.55${clean}`)
    .maybeSingle();
  return data?.user_id || null;
}

// ─── SAVE TRANSACTION ──────────────────────────────
async function saveTransaction(userId: string, tx: any) {
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    date: new Date().toISOString().split("T")[0],
    origin: "personal",
    source: "whatsapp",
  });
  if (error) console.error("saveTransaction error:", error);
  return !error;
}

// ─── MESSAGE HISTORY ───────────────────────────────
async function saveMessage(
  userId: string | null,
  phone: string,
  role: "user" | "assistant",
  content: string,
) {
  await supabase.from("whatsapp_messages").insert({
    user_id: userId,
    phone,
    phone_number: phone,
    role,
    content,
    direction: role === "user" ? "inbound" : "outbound",
    message: content,
  });
}

function fmt(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── MAIN ──────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  try {
    const body = await req.json();
    console.log("Z-API webhook payload:", JSON.stringify(body));

    const phone = (body?.phone || "").toString().replace("@s.whatsapp.net", "");
    const text = body?.text?.message;
    const image = body?.image;
    const isGroup = body?.isGroup || false;

    if (isGroup || body?.fromMe || !phone) {
      return new Response("OK", { status: 200 });
    }

    const userId = await getUserByPhone(phone);

    // Unlinked user
    if (!userId) {
      const reply = `Olá! 👋 Sou a *Kora IA* do KoraFinance 🐨

Para registrar seus gastos por aqui, conecte seu número no app:

1️⃣ Acesse *korafinance.app*
2️⃣ Vá em Configurações → WhatsApp
3️⃣ Informe este número

Depois é só mandar mensagens como:
💸 _"gastei 50 no mercado"_
💰 _"recebi 3000 de salário"_
📷 _Foto do cupom fiscal_

Que eu registro tudo automaticamente! ✅`;
      await sendMessage(phone, reply);
      await saveMessage(null, phone, "assistant", reply);
      return new Response("OK", { status: 200 });
    }

    // IMAGE
    if (image?.imageUrl || image?.url) {
      const imageUrl = image.imageUrl || image.url;
      const mimeType = image.mimeType || "image/jpeg";
      await saveMessage(userId, phone, "user", "[imagem]");

      const imageBase64 = await downloadImage(imageUrl);
      const result = await processImage(imageBase64, mimeType);

      let reply: string;
      if (result.is_transaction && result.transactions?.length > 0) {
        let saved = 0;
        for (const tx of result.transactions) {
          if (tx.amount > 0) {
            const ok = await saveTransaction(userId, tx);
            if (ok) saved++;
          }
        }

        if (saved > 0) {
          const lines = result.transactions
            .filter((t: any) => t.amount > 0)
            .map((t: any) => `${t.type === "expense" ? "💸" : "💰"} ${t.description} — ${fmt(t.amount)}`)
            .join("\n");

          reply = `✅ *${saved} lançamento${saved > 1 ? "s" : ""} registrado${saved > 1 ? "s" : ""}!*

${lines}

${result.establishment ? `🏪 ${result.establishment}\n` : ""}💵 Total: ${fmt(result.total || 0)}

Tudo salvo no KoraFinance! 🐨`;
        } else {
          reply = "❌ Não consegui salvar os lançamentos. Tente novamente.";
        }
      } else {
        reply = result.reply || "Não consegui identificar dados financeiros nesta imagem. Pode descrever o gasto em texto?";
      }

      await sendMessage(phone, reply);
      await saveMessage(userId, phone, "assistant", reply);
      return new Response("OK", { status: 200 });
    }

    // TEXT
    if (text) {
      await saveMessage(userId, phone, "user", text);

      const { data: history } = await supabase
        .from("whatsapp_messages")
        .select("role, content")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(6);

      const context = { recentMessages: history?.reverse() || [] };
      const result = await processText(text, context);

      let reply: string;
      if (result.is_transaction && result.amount > 0) {
        const saved = await saveTransaction(userId, result);
        if (saved) {
          const emoji = result.type === "expense" ? "💸" : "💰";
          const label = result.type === "expense" ? "Despesa" : "Receita";
          reply = `${emoji} *${label} registrada!*

📝 ${result.description}
💵 ${fmt(result.amount)}
🏷️ ${result.category}
📅 Hoje

${result.reply || "Salvo no KoraFinance! ✅"}`;
        } else {
          reply = "❌ Erro ao salvar. Tente novamente.";
        }
      } else {
        reply = result.reply || "Não entendi. Pode repetir?";
      }

      await sendMessage(phone, reply);
      await saveMessage(userId, phone, "assistant", reply);
      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

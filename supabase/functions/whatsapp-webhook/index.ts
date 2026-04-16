import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const AI_GATEWAY_URL = "https://ai-gateway.lovable.dev/v1/chat/completions";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/** Detect sandbox vs production based on configured number */
function getWhatsAppConfig() {
  const configuredNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";
  const SANDBOX_NUMBER = "+14155238886";
  const isProduction = configuredNumber !== "" && configuredNumber !== SANDBOX_NUMBER;
  const fromNumber = isProduction ? configuredNumber : SANDBOX_NUMBER;
  return { isProduction, fromNumber };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let phoneNumber = "";
    let body = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const from = formData.get("From")?.toString() || "";
      body = formData.get("Body")?.toString()?.trim() || "";
      phoneNumber = from.replace("whatsapp:", "").replace("+", "");
    } else {
      const json = await req.json();
      phoneNumber = json.phoneNumber?.replace("+", "") || "";
      body = json.message?.trim() || "";
    }

    console.log(`📱 WhatsApp from ${phoneNumber}: "${body}"`);

    if (!body) return twimlResponse("");

    const config = getWhatsAppConfig();

    // Find user
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("user_id, active")
      .eq("phone_number", phoneNumber)
      .eq("verified", true)
      .single();

    if (!connection) {
      await sendWhatsApp(phoneNumber, config.fromNumber, "👋 Número não vinculado ao KoraFinance.\n\nAcesse o app → Configurações → WhatsApp para conectar.");
      return twimlResponse("");
    }

    if (!connection.active) {
      await sendWhatsApp(phoneNumber, config.fromNumber, "IA desativada. Reative em Configurações → WhatsApp.");
      return twimlResponse("");
    }

    const userId = connection.user_id;

    // Save inbound
    await supabase.from("whatsapp_messages").insert({
      user_id: userId, phone_number: phoneNumber, direction: "inbound", message: body,
    });

    await supabase.from("whatsapp_connections")
      .update({ last_message_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Process with AI
    const reply = await processWithAI(userId, body);

    // Send reply (within 24h session window — plain text works for both sandbox and production)
    await sendWhatsApp(phoneNumber, config.fromNumber, reply);

    // Save outbound
    await supabase.from("whatsapp_messages").insert({
      user_id: userId, phone_number: phoneNumber, direction: "outbound", message: reply,
    });

    return twimlResponse("");
  } catch (error) {
    console.error("Webhook error:", error);
    return twimlResponse("");
  }
});

// ━━━ PROCESS WITH AI (Lovable AI Gateway) ━━━
async function processWithAI(userId: string, message: string): Promise<string> {
  const data = await loadFinancialData(userId);

  const { data: ctx } = await supabase
    .from("whatsapp_context")
    .select("messages, pending_confirmation")
    .eq("user_id", userId)
    .single();

  const history = ctx?.messages || [];
  const pending = ctx?.pending_confirmation;

  // Confirmation flow
  if (pending) {
    const lower = message.toLowerCase().trim();
    if (["sim", "s", "ok", "yes", "confirmar", "1"].includes(lower)) {
      await clearPending(userId);
      return await executeTransaction(userId, pending, data);
    }
    if (["não", "nao", "n", "no", "cancelar", "2"].includes(lower)) {
      await clearPending(userId);
      return "❌ Cancelado! Como posso ajudar?";
    }
  }

  const systemPrompt = buildSystemPrompt(data);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return "❌ Erro de configuração. Tente novamente mais tarde.";
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    console.error("AI Gateway error:", await response.text());
    return "❌ Erro ao processar. Tente novamente.";
  }

  const result = await response.json();
  const aiText = result.choices?.[0]?.message?.content || "";

  let finalReply = aiText;

  // Parse action JSON
  try {
    const trimmed = aiText.trim();
    if (trimmed.startsWith("{")) {
      const action = JSON.parse(trimmed);
      if (action.action === "expense" || action.action === "income") {
        if (action.confirm) {
          await setPending(userId, action);
          finalReply =
            `⚠️ *Confirmar?*\n\n${action.action === "expense" ? "💸 Despesa" : "💰 Receita"}: *R$ ${parseFloat(action.amount).toFixed(2)}*\n📝 ${action.description}\n📂 ${action.category}\n\nResponda *SIM* ou *NÃO*`;
        } else {
          finalReply = await executeTransaction(userId, action, data);
        }
      }
    }
  } catch {
    // Plain text response
  }

  // Save context
  const userMsg = { role: "user", content: message };
  const assistantMsg = { role: "assistant", content: finalReply };
  await supabase.from("whatsapp_context").upsert({
    user_id: userId,
    messages: [...history.slice(-8), userMsg, assistantMsg],
    pending_confirmation: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return finalReply;
}

// ━━━ SYSTEM PROMPT ━━━
function buildSystemPrompt(data: any): string {
  return `Você é a KoraFinance IA no WhatsApp — assistente financeira pessoal.

━━━ DADOS FINANCEIROS (${new Date().toLocaleDateString("pt-BR")}) ━━━
Nome: ${data.name}
Saldo do mês: R$ ${data.balance.toFixed(2)} ${data.balance >= 0 ? "✓" : "⚠️"}
Receitas: R$ ${data.income.toFixed(2)}
Despesas: R$ ${data.expenses.toFixed(2)}
Score: ${data.score}/1000

Gastos por categoria:
${data.categories.map((c: any) => `• ${c.category}: R$ ${c.total.toFixed(2)}`).join("\n") || "• Nenhum gasto"}

Dívidas:
${data.debts.length > 0 ? data.debts.map((d: any) => `• ${d.name}: R$ ${Number(d.remaining_amount).toFixed(2)}`).join("\n") : "• Sem dívidas ✓"}

Metas:
${data.goals.length > 0 ? data.goals.map((g: any) => `• ${g.name}: ${((Number(g.current_amount || 0) / Number(g.target_amount)) * 100).toFixed(0)}%`).join("\n") : "• Sem metas"}

Orçamentos:
${data.budgets.length > 0 ? data.budgets.map((b: any) => `• ${b.category}: R$ ${(b.spent || 0).toFixed(0)}/${b.limit_amount} (${((b.spent || 0) / b.limit_amount * 100).toFixed(0)}%)`).join("\n") : "• Sem orçamentos"}

━━━ COMO RESPONDER ━━━

Para REGISTRAR GASTO (gastei, paguei, comprei):
Responda SOMENTE com JSON:
{"action":"expense","amount":VALOR,"description":"descrição","category":"Categoria","confirm":false}
Se valor > 500: confirm:true

Para REGISTRAR RECEITA (recebi, entrou, ganhei):
{"action":"income","amount":VALOR,"description":"descrição","category":"Categoria"}

Para CONSULTAS: texto simples, *negrito* nos valores, máx 5 linhas, dados reais.

REGRAS:
- Use dados reais SEMPRE
- Respostas curtas (WhatsApp)
- Português brasileiro informal
- Para registros responda SOMENTE JSON`;
}

// ━━━ EXECUTE TRANSACTION ━━━
async function executeTransaction(userId: string, action: any, data: any): Promise<string> {
  const amount = parseFloat(action.amount);
  const type = action.action === "income" ? "income" : "expense";

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    type,
    amount,
    description: action.description,
    category: action.category || detectCategory(action.description, type),
    date: new Date().toISOString().split("T")[0],
    origin: "personal",
  });

  if (error) {
    console.error("Transaction error:", error);
    return "❌ Erro ao registrar. Tente novamente.";
  }

  const newBalance = type === "income" ? data.balance + amount : data.balance - amount;
  const alert = checkBudget(action.category, amount, data.budgets);

  let reply = type === "expense"
    ? `✅ *Despesa registrada!*\n\n💸 R$ ${amount.toFixed(2)} — ${action.category}\n📝 ${action.description}\n💰 Saldo: *R$ ${newBalance.toFixed(2)}*`
    : `✅ *Receita registrada!*\n\n💰 R$ ${amount.toFixed(2)} — ${action.category}\n📝 ${action.description}\n💰 Saldo: *R$ ${newBalance.toFixed(2)}*`;

  if (alert) reply += `\n\n⚠️ ${alert}`;
  return reply;
}

// ━━━ LOAD FINANCIAL DATA ━━━
async function loadFinancialData(userId: string) {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [txRes, debtRes, goalRes, budgetRes, profileRes, configRes] = await Promise.all([
    supabase.from("transactions").select("type,amount,category").eq("user_id", userId).gte("date", firstDay).is("deleted_at", null),
    supabase.from("debts").select("name,remaining_amount").eq("user_id", userId).eq("status", "active"),
    supabase.from("goals").select("name,current_amount,target_amount").eq("user_id", userId).is("deleted_at", null),
    supabase.from("budgets").select("category,limit_amount").eq("user_id", userId),
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
    supabase.from("user_config").select("financial_score").eq("user_id", userId).single(),
  ]);

  const txs = txRes.data || [];
  const income = txs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);

  const catMap: Record<string, number> = {};
  txs.filter((t: any) => t.type === "expense").forEach((t: any) => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });

  return {
    name: profileRes.data?.full_name?.split(" ")[0] || "usuário",
    income,
    expenses,
    balance: income - expenses,
    categories: Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, total]) => ({ category, total })),
    debts: debtRes.data || [],
    goals: goalRes.data || [],
    budgets: (budgetRes.data || []).map((b: any) => ({ ...b, spent: catMap[b.category] || 0 })),
    score: configRes.data?.financial_score || 0,
  };
}

// ━━━ HELPERS ━━━
function checkBudget(category: string, amount: number, budgets: any[]): string | null {
  const b = budgets?.find((x: any) => x.category === category);
  if (!b) return null;
  const pct = ((b.spent || 0) + amount) / b.limit_amount * 100;
  if (pct >= 100) return `Orçamento de *${category}* estourado! (${pct.toFixed(0)}%)`;
  if (pct >= 80) return `Orçamento de *${category}* em ${pct.toFixed(0)}% do limite.`;
  return null;
}

async function setPending(userId: string, action: any) {
  await supabase.from("whatsapp_context").upsert({
    user_id: userId, pending_confirmation: action, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function clearPending(userId: string) {
  await supabase.from("whatsapp_context").update({ pending_confirmation: null }).eq("user_id", userId);
}

function detectCategory(desc: string, type: string): string {
  if (type === "income") {
    if (/salário|salario/i.test(desc)) return "Salário";
    if (/freelance|freela/i.test(desc)) return "Freelance";
    if (/venda/i.test(desc)) return "Vendas";
    return "Outro";
  }
  if (/mercado|supermercado/i.test(desc)) return "Supermercado";
  if (/ifood|rappi|restaurante|lanche/i.test(desc)) return "Alimentação";
  if (/uber|99|gasolina|metrô/i.test(desc)) return "Transporte";
  if (/aluguel|condomínio/i.test(desc)) return "Moradia";
  if (/farmácia|médico|saúde/i.test(desc)) return "Saúde";
  if (/netflix|spotify|assinatura/i.test(desc)) return "Assinaturas";
  return "Outros";
}

function twimlResponse(msg: string): Response {
  const xml = msg
    ? `<?xml version="1.0"?><Response><Message>${msg}</Message></Response>`
    : `<?xml version="1.0"?><Response></Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" }, status: 200 });
}

async function sendWhatsApp(to: string, from: string, message: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) { console.error("LOVABLE_API_KEY not configured"); return; }
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!TWILIO_API_KEY) { console.error("TWILIO_API_KEY not configured"); return; }

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

  if (!resp.ok) {
    console.error("Twilio gateway error:", await resp.text());
  }
}

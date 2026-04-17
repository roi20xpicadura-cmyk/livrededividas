import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIRMATION_THRESHOLD = 500;

// ─── Z-API SEND ─────────────────────────────────────
async function sendMessage(phone: string, text: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  console.log("[Z-API SEND] →", phone, "| len:", text.length, "| instance:", ZAPI_INSTANCE_ID?.slice(0, 8));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message: text }),
    });
    const respText = await res.text();
    console.log("[Z-API SEND] status:", res.status, "| body:", respText.slice(0, 300));
    if (!res.ok) console.error("[Z-API SEND] FAILED", res.status, respText);
  } catch (e) {
    console.error("[Z-API SEND] EXCEPTION", e);
  }
}

async function downloadImage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { headers: { "Client-Token": ZAPI_CLIENT_TOKEN } });
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fmt(value: number): string {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── CATEGORY DETECTION ─────────────────────────────
const CATEGORY_RULES: Array<{ keywords: RegExp; category: string }> = [
  { keywords: /\b(mercado|supermercado|hortifruti|açougue|padaria|atacad)/i, category: "Supermercado" },
  { keywords: /\b(ifood|rappi|delivery|lanche|pizza|hamb[uú]rg|restaurante|jantar|almoço|comida)/i, category: "Alimentação" },
  { keywords: /\b(uber|99|t[áa]xi|combust[íi]vel|gasolina|[áa]lcool|estaciona|pedágio|[ôo]nibus|metr[ôo])/i, category: "Transporte" },
  { keywords: /\b(luz|energia|[áa]gua|internet|telefone|celular|condom[íi]nio|aluguel|g[áa]s)/i, category: "Moradia" },
  { keywords: /\b(farm[áa]cia|rem[ée]dio|m[ée]dico|consulta|exame|hospital|dentista|sa[úu]de)/i, category: "Saúde" },
  { keywords: /\b(escola|faculdade|curso|livro|mensalidade|educa[çc][ãa]o)/i, category: "Educação" },
  { keywords: /\b(cinema|netflix|spotify|show|bar|balada|lazer|jogo|game)/i, category: "Lazer" },
  { keywords: /\b(roupa|cal[çc]ado|t[êe]nis|sapato|loja|shopping|compra)/i, category: "Vestuário" },
  { keywords: /\b(sal[áa]rio|sal[áa]rios|pagamento|pix recebido|recebi)/i, category: "Salário" },
  { keywords: /\b(venda|vendi|freela|freelance|servi[çc]o)/i, category: "Vendas" },
];

function detectCategory(description: string, fallback?: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(description)) return rule.category;
  }
  return fallback || "Outros";
}

// ─── USER LOOKUP ────────────────────────────────────
async function getUserByPhone(phone: string) {
  const clean = phone.replace(/\D/g, "");
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("user_id")
    .or(`phone_number.eq.${clean},phone_number.eq.55${clean}`)
    .maybeSingle();
  return data?.user_id || null;
}

// ─── LOAD FINANCIAL DATA ────────────────────────────
async function loadFinancialData(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [txRes, debtsRes, goalsRes, budgetsRes, configRes] = await Promise.all([
    supabase.from("transactions").select("type, amount, category, description, date")
      .eq("user_id", userId).is("deleted_at", null).gte("date", monthStart).order("date", { ascending: false }),
    supabase.from("debts").select("name, creditor, remaining_amount, min_payment, due_day, status")
      .eq("user_id", userId).is("deleted_at", null).eq("status", "active"),
    supabase.from("goals").select("name, target_amount, current_amount, deadline")
      .eq("user_id", userId).is("deleted_at", null),
    supabase.from("budgets").select("category, limit_amount").eq("user_id", userId).eq("month_year", monthYear),
    supabase.from("user_config").select("financial_score, xp_points, level, streak_days").eq("user_id", userId).maybeSingle(),
  ]);

  const txs = txRes.data || [];
  const income = txs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expense = txs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const t of txs.filter((x: any) => x.type === "expense")) {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  }

  return {
    monthYear,
    income,
    expense,
    balance: income - expense,
    txCount: txs.length,
    byCategory,
    recentTxs: txs.slice(0, 10),
    debts: debtsRes.data || [],
    goals: goalsRes.data || [],
    budgets: budgetsRes.data || [],
    config: configRes.data || {},
  };
}

// ─── SYSTEM PROMPT ──────────────────────────────────
function buildSystemPrompt(fin: any, pendingConfirmation: any): string {
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const catLines = Object.entries(fin.byCategory)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 8)
    .map(([c, v]: any) => `  - ${c}: ${fmt(v)}`)
    .join("\n") || "  (sem despesas ainda)";

  const debtLines = fin.debts.slice(0, 5).map((d: any) =>
    `  - ${d.name} (${d.creditor}): ${fmt(Number(d.remaining_amount))} restante`,
  ).join("\n") || "  (nenhuma dívida ativa)";

  const goalLines = fin.goals.slice(0, 5).map((g: any) => {
    const pct = g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
    return `  - ${g.name}: ${fmt(Number(g.current_amount))} / ${fmt(Number(g.target_amount))} (${pct}%)`;
  }).join("\n") || "  (nenhuma meta)";

  const budgetLines = fin.budgets.map((b: any) => {
    const used = fin.byCategory[b.category] || 0;
    const pct = b.limit_amount > 0 ? Math.round((used / Number(b.limit_amount)) * 100) : 0;
    return `  - ${b.category}: ${fmt(used)} / ${fmt(Number(b.limit_amount))} (${pct}%)`;
  }).join("\n") || "  (sem orçamentos)";

  const pending = pendingConfirmation
    ? `\n⚠️ CONFIRMAÇÃO PENDENTE: usuário precisa confirmar transação de ${fmt(pendingConfirmation.amount)} (${pendingConfirmation.description}). Se ele responder SIM/sim/s/confirmar, retorne {"action":"confirm"}. Se NÃO/nao/n/cancelar, retorne {"action":"cancel"}.\n`
    : "";

  return `Você é a Kora IA do KoraFinance 🐨, assistente financeira via WhatsApp.

📊 DADOS REAIS DO USUÁRIO (${monthLabel}):
- Receitas do mês: ${fmt(fin.income)}
- Despesas do mês: ${fmt(fin.expense)}
- Saldo do mês: ${fmt(fin.balance)}
- Transações no mês: ${fin.txCount}
- Score financeiro: ${fin.config.financial_score ?? 0} | XP: ${fin.config.xp_points ?? 0} | Nível: ${fin.config.level ?? "iniciante"}

💸 GASTOS POR CATEGORIA:
${catLines}

🎯 METAS:
${goalLines}

💳 DÍVIDAS ATIVAS:
${debtLines}

📋 ORÇAMENTOS:
${budgetLines}
${pending}

REGRAS — RETORNE APENAS JSON PURO, SEM MARKDOWN:

1) Se for nova TRANSAÇÃO:
{"action":"transaction","type":"expense"|"income","amount":number,"description":"...","category":"...","reply":"texto curto"}

2) Se for PERGUNTA sobre finanças (saldo, gastos, dívidas, metas):
{"action":"answer","reply":"resposta usando os dados reais acima"}

3) Se confirmar pendência: {"action":"confirm"}
4) Se cancelar pendência: {"action":"cancel"}
5) Conversa geral: {"action":"chat","reply":"..."}

Exemplos:
- "gastei 50 no mercado" → {"action":"transaction","type":"expense","amount":50,"description":"Mercado","category":"Supermercado","reply":"💸 R$ 50 em Supermercado"}
- "quanto gastei esse mês?" → {"action":"answer","reply":"Você gastou ${fmt(fin.expense)} este mês."}
- "qual meu saldo?" → {"action":"answer","reply":"Seu saldo do mês é ${fmt(fin.balance)}."}

IMPORTANTE: amount é número (não string). Sem \`\`\`json. Apenas o JSON.`;
}

// ─── CALL CLAUDE ────────────────────────────────────
async function callClaude(systemPrompt: string, history: any[], userMessage: string) {
  const messages = [
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
    { role: "assistant", content: "{" },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    console.error("Claude error:", response.status, await response.text());
    return { action: "chat", reply: "❌ Erro ao processar. Tente novamente." };
  }

  const data = await response.json();
  let text = "{" + (data.content?.[0]?.text || "");
  console.log("Claude raw:", text);

  try { return JSON.parse(text); }
  catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch { /* fall through */ } }
    return { action: "chat", reply: "Não entendi. Pode reformular?" };
  }
}

// ─── CONTEXT (history + pending) ────────────────────
async function loadContext(userId: string) {
  const { data } = await supabase
    .from("whatsapp_context")
    .select("messages, pending_confirmation, last_intent")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    messages: (data?.messages as any[]) || [],
    pending: data?.pending_confirmation as any || null,
    lastIntent: data?.last_intent || null,
  };
}

async function saveContext(
  userId: string,
  messages: any[],
  pending: any | null,
  lastIntent: string | null,
) {
  const trimmed = messages.slice(-6);
  await supabase.from("whatsapp_context").upsert({
    user_id: userId,
    messages: trimmed,
    pending_confirmation: pending,
    last_intent: lastIntent,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

// ─── SAVE TRANSACTION + BUDGET CHECK ────────────────
async function executeTransaction(userId: string, tx: any): Promise<{ ok: boolean; budgetWarning?: string }> {
  const category = detectCategory(tx.description || "", tx.category);
  const monthYear = new Date().toISOString().slice(0, 7);

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    category,
    date: new Date().toISOString().split("T")[0],
    origin: "personal",
    source: "whatsapp",
  });

  if (error) {
    console.error("executeTransaction error:", error);
    return { ok: false };
  }

  // Budget check (only for expenses)
  let budgetWarning: string | undefined;
  if (tx.type === "expense") {
    const { data: budget } = await supabase
      .from("budgets")
      .select("limit_amount")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (budget?.limit_amount) {
      const monthStart = `${monthYear}-01`;
      const { data: spent } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "expense")
        .eq("category", category)
        .is("deleted_at", null)
        .gte("date", monthStart);

      const total = (spent || []).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const limit = Number(budget.limit_amount);
      const pct = (total / limit) * 100;

      if (pct >= 100) {
        budgetWarning = `🚨 *Orçamento estourado!* ${category}: ${fmt(total)} de ${fmt(limit)} (${Math.round(pct)}%)`;
      } else if (pct >= 80) {
        budgetWarning = `⚠️ *Atenção:* ${category} já em ${Math.round(pct)}% do orçamento (${fmt(total)} de ${fmt(limit)})`;
      }
    }
  }

  return { ok: true, budgetWarning };
}

// ─── MESSAGE LOG ────────────────────────────────────
async function saveMessage(userId: string | null, phone: string, role: "user" | "assistant", content: string) {
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

// ─── IMAGE PROCESSING (kept) ────────────────────────
async function processImage(imageBase64: string, mimeType: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: `Analise cupom/nota/comprovante e retorne APENAS JSON:
{"is_transaction":true,"transactions":[{"type":"expense","amount":number,"description":"...","category":"..."}],"total":number,"establishment":"...","reply":"..."}
Se não conseguir: {"is_transaction":false,"reply":"..."}`,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
          { type: "text", text: "Extraia os dados financeiros." },
        ],
      }],
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { is_transaction: false, reply: "Não consegui ler a imagem." };
  }
}

// ─── MAIN ───────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  try {
    const body = await req.json();
    console.log("Z-API webhook:", JSON.stringify(body));

    const phone = (body?.phone || "").toString().replace("@s.whatsapp.net", "");
    const text: string | undefined = body?.text?.message;
    const image = body?.image;
    const isGroup = body?.isGroup || false;

    if (isGroup || body?.fromMe || !phone) return new Response("OK", { status: 200 });

    const userId = await getUserByPhone(phone);

    // Unlinked
    if (!userId) {
      const reply = `Olá! 👋 Sou a *Kora IA* do KoraFinance 🐨

Para registrar gastos, conecte seu número:
1️⃣ Acesse *korafinance.app*
2️⃣ Configurações → WhatsApp
3️⃣ Informe este número

Depois mande: _"gastei 50 no mercado"_ ✅`;
      await sendMessage(phone, reply);
      await saveMessage(null, phone, "assistant", reply);
      return new Response("OK", { status: 200 });
    }

    // IMAGE flow (kept simple, with budget check)
    if (image?.imageUrl || image?.url) {
      const imageUrl = image.imageUrl || image.url;
      const mimeType = image.mimeType || "image/jpeg";
      await saveMessage(userId, phone, "user", "[imagem]");

      const imgB64 = await downloadImage(imageUrl);
      const result = await processImage(imgB64, mimeType);

      let reply: string;
      if (result.is_transaction && result.transactions?.length) {
        let saved = 0;
        const warnings: string[] = [];
        for (const tx of result.transactions) {
          if (tx.amount > 0) {
            const r = await executeTransaction(userId, tx);
            if (r.ok) {
              saved++;
              if (r.budgetWarning) warnings.push(r.budgetWarning);
            }
          }
        }
        const lines = result.transactions.filter((t: any) => t.amount > 0)
          .map((t: any) => `${t.type === "expense" ? "💸" : "💰"} ${t.description} — ${fmt(t.amount)}`).join("\n");
        reply = `✅ *${saved} lançamento${saved > 1 ? "s" : ""} salvo${saved > 1 ? "s" : ""}!*

${lines}

${result.establishment ? `🏪 ${result.establishment}\n` : ""}💵 Total: ${fmt(result.total || 0)}${warnings.length ? "\n\n" + warnings.join("\n") : ""}`;
      } else {
        reply = result.reply || "Não consegui ler a imagem.";
      }

      await sendMessage(phone, reply);
      await saveMessage(userId, phone, "assistant", reply);
      return new Response("OK", { status: 200 });
    }

    // TEXT flow
    if (!text) return new Response("OK", { status: 200 });

    await saveMessage(userId, phone, "user", text);

    const ctx = await loadContext(userId);
    const fin = await loadFinancialData(userId);
    const systemPrompt = buildSystemPrompt(fin, ctx.pending);

    const result = await callClaude(systemPrompt, ctx.messages, text);

    let reply = "";
    let newPending = ctx.pending;
    let lastIntent = ctx.lastIntent;

    // CONFIRM pending
    if (result.action === "confirm" && ctx.pending) {
      const r = await executeTransaction(userId, ctx.pending);
      reply = r.ok
        ? `✅ Confirmado e salvo!\n\n💸 ${ctx.pending.description} — ${fmt(ctx.pending.amount)}${r.budgetWarning ? "\n\n" + r.budgetWarning : ""}`
        : "❌ Erro ao salvar. Tente novamente.";
      newPending = null;
      lastIntent = "confirm";
    }
    // CANCEL pending
    else if (result.action === "cancel" && ctx.pending) {
      reply = "❌ Cancelado. Nada foi registrado.";
      newPending = null;
      lastIntent = "cancel";
    }
    // NEW TRANSACTION
    else if (result.action === "transaction" && result.amount > 0) {
      const category = detectCategory(result.description || "", result.category);
      if (Number(result.amount) > CONFIRMATION_THRESHOLD) {
        newPending = { type: result.type, amount: Number(result.amount), description: result.description, category };
        lastIntent = "pending_confirmation";
        reply = `⚠️ *Confirme essa transação:*

${result.type === "expense" ? "💸 Despesa" : "💰 Receita"}: ${fmt(result.amount)}
📝 ${result.description}
🏷️ ${category}

Responda *SIM* para salvar ou *NÃO* para cancelar.`;
      } else {
        const r = await executeTransaction(userId, { ...result, category });
        reply = r.ok
          ? `${result.type === "expense" ? "💸" : "💰"} *${result.type === "expense" ? "Despesa" : "Receita"} salva!*

📝 ${result.description}
💵 ${fmt(result.amount)}
🏷️ ${category}${r.budgetWarning ? "\n\n" + r.budgetWarning : ""}`
          : "❌ Erro ao salvar. Tente novamente.";
        lastIntent = "transaction";
      }
    }
    // ANSWER / CHAT
    else {
      reply = result.reply || "Não entendi. Pode reformular?";
      lastIntent = result.action || "chat";
    }

    // Update history
    const newMessages = [
      ...ctx.messages,
      { role: "user", content: text },
      { role: "assistant", content: reply },
    ];
    await saveContext(userId, newMessages, newPending, lastIntent);

    await sendMessage(phone, reply);
    await saveMessage(userId, phone, "assistant", reply);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

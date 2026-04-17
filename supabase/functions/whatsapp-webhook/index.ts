import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── HELPERS ────────────────────────────────────────
function fmt(v: number): string {
  return "R$ " + (v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function sendWhatsApp(phone: string, text: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  console.log("[Z-API SEND] →", phone, "| len:", text.length);
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
  } catch (e) {
    console.error("[Z-API SEND] EXCEPTION", e);
  }
}

async function downloadImageBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl, { headers: { "Client-Token": ZAPI_CLIENT_TOKEN } });
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.includes("png")
    ? "image/png"
    : contentType.includes("webp")
    ? "image/webp"
    : "image/jpeg";
  return { base64: btoa(binary), mimeType };
}

// ─── IMPROVEMENT 1: FULL FINANCIAL CONTEXT ──────────
async function loadUserContext(userId: string) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split("T")[0];

  const [txRes, debtRes, goalRes, budgetRes, profileRes, configRes] = await Promise.all([
    supabase.from("transactions")
      .select("type, amount, category, description, date")
      .eq("user_id", userId)
      .gte("date", firstDay)
      .is("deleted_at", null)
      .order("date", { ascending: false }),

    supabase.from("debts")
      .select("name, total_amount, remaining_amount, interest_rate, due_day, min_payment")
      .eq("user_id", userId)
      .eq("status", "active"),

    supabase.from("goals")
      .select("name, target_amount, current_amount, deadline")
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase.from("budgets")
      .select("category, limit_amount")
      .eq("user_id", userId),

    supabase.from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single(),

    supabase.from("user_config")
      .select("financial_score, profile_type")
      .eq("user_id", userId)
      .single(),
  ]);

  const txs = txRes.data || [];
  const income = txs.filter((t: any) => t.type === "income")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txs.filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const catMap: Record<string, number> = {};
  txs.filter((t: any) => t.type === "expense").forEach((t: any) => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });

  const budgets = (budgetRes.data || []).map((b: any) => {
    const spent = catMap[b.category] || 0;
    const pct = (spent / Number(b.limit_amount)) * 100;
    return {
      category: b.category,
      limit: Number(b.limit_amount),
      spent,
      pct: Math.round(pct),
      status: pct >= 100 ? "🚨 ESTOURADO" : pct >= 80 ? "⚠️ ATENÇÃO" : "✅ OK",
    };
  });

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, lastDay.getDate() - now.getDate());
  const dailyBudget = ((income - expenses) / daysLeft).toFixed(2);

  return {
    name: profileRes.data?.full_name?.split(" ")[0] || "usuário",
    score: configRes.data?.financial_score || 0,
    profile: configRes.data?.profile_type || "personal",
    income,
    expenses,
    balance: income - expenses,
    daysLeft,
    dailyBudget,
    recentTxs: txs.slice(0, 5),
    categories: Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => ({ category: cat, amount: val })),
    budgets,
    debts: (debtRes.data || []).map((d: any) => ({
      name: d.name,
      remaining: Number(d.remaining_amount),
      rate: Number(d.interest_rate || 0),
      due_day: d.due_day,
      min_payment: Number(d.min_payment || 0),
    })),
    goals: (goalRes.data || []).map((g: any) => ({
      name: g.name,
      current: Number(g.current_amount),
      target: Number(g.target_amount),
      deadline: g.deadline,
      pct: Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100),
    })),
  };
}

// ─── IMPROVEMENT 2: POWERFUL SYSTEM PROMPT ──────────
function buildSystemPrompt(ctx: any): string {
  const budgetAlerts = ctx.budgets
    .filter((b: any) => b.pct >= 80)
    .map((b: any) =>
      `  ⚠️ ${b.category}: ${b.pct}% usado (${fmt(b.spent)} de ${fmt(b.limit)})`
    ).join("\n") || "  ✅ Todos os orçamentos OK";

  const debtInfo = ctx.debts.length > 0
    ? ctx.debts.map((d: any) => {
        const monthsToPayoff = d.min_payment > 0
          ? Math.ceil(d.remaining / d.min_payment)
          : null;
        const months = monthsToPayoff ? `~${monthsToPayoff} meses para quitar` : "definir pagamento mínimo";
        return `  • ${d.name}: ${fmt(d.remaining)} restantes | ${d.rate}% a.m. | ${months}`;
      }).join("\n")
    : "  ✅ Sem dívidas ativas";

  const goalInfo = ctx.goals.length > 0
    ? ctx.goals.map((g: any) => {
        const deadline = g.deadline
          ? `até ${new Date(g.deadline).toLocaleDateString("pt-BR")}`
          : "sem prazo";
        return `  • ${g.name}: ${g.pct}% (${fmt(g.current)} de ${fmt(g.target)}) — ${deadline}`;
      }).join("\n")
    : "  📭 Sem metas cadastradas";

  const recentTxInfo = ctx.recentTxs.length > 0
    ? ctx.recentTxs.map((t: any) =>
        `  • ${t.date} | ${t.type === "expense" ? "💸" : "💰"} ${fmt(Number(t.amount))} — ${t.category} (${t.description})`
      ).join("\n")
    : "  📭 Sem lançamentos este mês";

  return `Você é a Kora IA 🐨, assistente financeira pessoal do KoraFinance.
Você está conversando com ${ctx.name} pelo WhatsApp.

━━━ DADOS FINANCEIROS DE ${ctx.name.toUpperCase()} — ${new Date().toLocaleDateString("pt-BR")} ━━━

💰 SALDO DO MÊS: ${fmt(ctx.balance)} ${ctx.balance >= 0 ? "✅" : "⚠️ NEGATIVO"}
  • Receitas: ${fmt(ctx.income)}
  • Despesas: ${fmt(ctx.expenses)}
  • Dias restantes no mês: ${ctx.daysLeft}
  • Orçamento diário disponível: ${fmt(Number(ctx.dailyBudget))}

📊 SCORE FINANCEIRO: ${ctx.score}/1000

💸 MAIORES GASTOS DO MÊS:
${ctx.categories.slice(0, 5).map((c: any) => `  • ${c.category}: ${fmt(c.amount)}`).join("\n") || "  Nenhum gasto ainda"}

🎯 ORÇAMENTOS:
${budgetAlerts}

📋 DÍVIDAS:
${debtInfo}

🏆 METAS:
${goalInfo}

📝 ÚLTIMOS LANÇAMENTOS:
${recentTxInfo}

━━━ COMO AGIR ━━━

PERSONALIDADE:
- Use sempre o nome "${ctx.name}" nas respostas
- Tom amigável, direto e motivador
- Emoji moderado (não exagere)
- Respostas curtas para WhatsApp (máx 5 linhas)
- Português brasileiro informal

PARA REGISTRAR GASTO (gastei, paguei, comprei, saiu):
Responda APENAS com JSON:
{"action":"expense","amount":VALOR,"description":"descrição","category":"Categoria","confirm":VALOR>500}

PARA REGISTRAR RECEITA (recebi, entrou, ganhei, depositou):
Responda APENAS com JSON:
{"action":"income","amount":VALOR,"description":"descrição","category":"Categoria","confirm":false}

PARA PERGUNTAS FINANCEIRAS: responda com dados REAIS do contexto acima.

Exemplos:
- "quanto gastei?" → use dados reais de expenses
- "quando vou quitar X?" → calcule com os dados de dívidas
- "quanto posso gastar por dia?" → use dailyBudget
- "como estão minhas metas?" → use dados de goals
- "estou indo bem?" → analise balance, score, budgets

REGRAS:
- NUNCA invente números — use SEMPRE os dados acima
- Se não souber responder, diga que vai verificar no app
- Para registros responda SOMENTE o JSON
- Para perguntas responda em texto simples
- Confirme gastos acima de R$500 antes de salvar`;
}

// ─── IMPROVEMENT 3: IMAGE PROCESSING ────────────────
async function processImage(imageUrl: string, userName: string): Promise<{
  transactions: any[];
  reply: string;
}> {
  try {
    const { base64, mimeType } = await downloadImageBase64(imageUrl);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `Você é a Kora IA do KoraFinance.
Analise a imagem e extraia dados financeiros.
A imagem pode ser: cupom fiscal, nota fiscal, comprovante, extrato ou print de app.

Responda APENAS com JSON válido:
{
  "found": true/false,
  "establishment": "nome do estabelecimento",
  "date": "data se visível",
  "total": valor total como número,
  "items": [
    {
      "description": "nome do item",
      "amount": valor como número,
      "category": "categoria",
      "type": "expense"
    }
  ],
  "summary": "resumo amigável"
}

Categorias: Supermercado, Alimentação, Delivery, Farmácia, Combustível, Transporte, Saúde, Lazer, Vestuário, Eletrônicos, Casa, Educação, Outros

Se não encontrar dados:
{"found": false, "summary": "Não consegui identificar dados financeiros"}`,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            { type: "text", text: "Analise esta imagem e extraia os dados financeiros." },
          ],
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

    if (!parsed.found || !parsed.items?.length) {
      return {
        transactions: [],
        reply: `Não consegui identificar dados financeiros nessa imagem, ${userName}. Tente descrever o gasto em texto: _"gastei X em Y"_ 😊`,
      };
    }

    const itemsList = parsed.items
      .map((item: any) => `  💸 ${item.description} — ${fmt(Number(item.amount))}`)
      .join("\n");

    const reply = `🧾 *Cupom encontrado!*${parsed.establishment ? `\n🏪 ${parsed.establishment}` : ""}

${itemsList}

💵 *Total: ${fmt(Number(parsed.total || 0))}*

Registrar tudo? Responda *SIM* para confirmar ou *NÃO* para cancelar.`;

    return { transactions: parsed.items, reply };
  } catch (e) {
    console.error("processImage error:", e);
    return {
      transactions: [],
      reply: `Não consegui ler essa imagem, ${userName}. Tente uma foto mais nítida ou descreva o gasto em texto 📷`,
    };
  }
}

// ─── IMPROVEMENT 4: PROACTIVE BUDGET ALERTS ─────────
async function checkAndAlertBudget(
  _userId: string,
  phone: string,
  category: string,
  userName: string,
  ctx: any,
  addedAmount: number,
) {
  const budget = ctx.budgets.find((b: any) => b.category === category);
  if (!budget) return;

  // recompute with newly added amount
  const newSpent = budget.spent + addedAmount;
  const newPct = Math.round((newSpent / budget.limit) * 100);

  let alertMsg: string | null = null;

  if (newPct >= 100) {
    alertMsg = `🚨 *Orçamento estourado, ${userName}!*

📂 ${budget.category}
💸 Gasto: ${fmt(newSpent)} (${newPct}%)
🎯 Limite: ${fmt(budget.limit)}
📊 Excedeu em ${fmt(newSpent - budget.limit)}

Tenta segurar os gastos nessa categoria! 💪`;
  } else if (newPct >= 80) {
    alertMsg = `⚠️ *Atenção ao orçamento, ${userName}!*

📂 ${budget.category}
📊 ${newPct}% do limite usado
💸 ${fmt(newSpent)} de ${fmt(budget.limit)}
💡 Restam apenas ${fmt(budget.limit - newSpent)}

Fique de olho! 👀`;
  }

  if (alertMsg) {
    await new Promise((r) => setTimeout(r, 1500));
    await sendWhatsApp(phone, alertMsg);
  }
}

// ─── IMPROVEMENT 5: MAIN HANDLER ────────────────────
serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  try {
    const body = await req.json();
    console.log("Z-API payload:", JSON.stringify(body).slice(0, 500));

    if (body.fromMe || body.isGroup) return new Response("OK", { status: 200 });

    const phone = (body.phone || "")
      .replace("@s.whatsapp.net", "")
      .replace(/\D/g, "");
    const text = body.text?.message?.trim();
    const image = body.image || body.imageMessage;

    if (!phone) return new Response("OK", { status: 200 });

    const { data: conn } = await supabase
      .from("whatsapp_connections")
      .select("user_id")
      .or(`phone_number.eq.${phone},phone_number.eq.55${phone}`)
      .eq("verified", true)
      .maybeSingle();

    if (!conn?.user_id) {
      await sendWhatsApp(phone,
        `👋 Olá! Sou a *Kora IA* do KoraFinance 🐨\n\nPara usar o assistente, conecte seu número:\n\n1️⃣ Acesse *korafinance.app*\n2️⃣ Configurações → WhatsApp\n3️⃣ Informe este número\n\nDepois é só mandar:\n💸 _"gastei 50 no mercado"_\n📷 _Foto do cupom fiscal_`
      );
      return new Response("OK", { status: 200 });
    }

    const userId = conn.user_id;
    const ctx = await loadUserContext(userId);

    await supabase.from("whatsapp_messages").insert({
      user_id: userId,
      phone,
      phone_number: phone,
      direction: "inbound",
      role: "user",
      message: text || "[imagem]",
      content: text || "[imagem]",
      created_at: new Date().toISOString(),
    });

    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    const { data: pending } = await supabase
      .from("whatsapp_context")
      .select("pending_confirmation, pending_transactions")
      .eq("user_id", userId)
      .maybeSingle();

    // ── CONFIRMATION FLOW ──
    if (pending?.pending_confirmation && text) {
      const lower = text.toLowerCase().trim();

      if (["sim", "s", "ok", "yes", "confirmar", "1"].includes(lower)) {
        const transactions = (pending.pending_transactions as any[]) || [];
        let saved = 0;

        for (const tx of transactions) {
          const { error } = await supabase.from("transactions").insert({
            user_id: userId,
            type: tx.type || "expense",
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: new Date().toISOString().split("T")[0],
            origin: "personal",
            source: "whatsapp",
          });
          if (!error) saved++;
        }

        await supabase.from("whatsapp_context")
          .update({ pending_confirmation: false, pending_transactions: null })
          .eq("user_id", userId);

        const total = transactions.reduce((s: number, t: any) => s + Number(t.amount), 0);
        const reply = `✅ *${saved} lançamento${saved > 1 ? "s" : ""} salvo${saved > 1 ? "s" : ""}!*\n\n💵 Total: *${fmt(total)}*\n\nTudo registrado no KoraFinance, ${ctx.name}! 🐨`;

        await sendWhatsApp(phone, reply);
        await supabase.from("whatsapp_messages").insert({
          user_id: userId, phone, phone_number: phone,
          direction: "outbound", role: "assistant",
          message: reply, content: reply,
          created_at: new Date().toISOString(),
        });

        // Budget alerts grouped by category
        const byCat: Record<string, number> = {};
        for (const tx of transactions) {
          if ((tx.type || "expense") === "expense") {
            byCat[tx.category] = (byCat[tx.category] || 0) + Number(tx.amount);
          }
        }
        for (const [cat, amt] of Object.entries(byCat)) {
          await checkAndAlertBudget(userId, phone, cat, ctx.name, ctx, amt);
        }

        return new Response("OK", { status: 200 });
      } else if (["não", "nao", "n", "no", "cancelar", "2"].includes(lower)) {
        await supabase.from("whatsapp_context")
          .update({ pending_confirmation: false, pending_transactions: null })
          .eq("user_id", userId);

        const reply = `❌ Cancelado! Como posso ajudar, ${ctx.name}?`;
        await sendWhatsApp(phone, reply);
        return new Response("OK", { status: 200 });
      }
    }

    // ── IMAGE PROCESSING ──
    if (image) {
      const imageUrl = typeof image === "string"
        ? image
        : (image.imageUrl || image.url);

      const { transactions, reply } = await processImage(imageUrl, ctx.name);

      if (transactions.length > 0) {
        await supabase.from("whatsapp_context").upsert({
          user_id: userId,
          pending_confirmation: true,
          pending_transactions: transactions,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }

      await sendWhatsApp(phone, reply);
      await supabase.from("whatsapp_messages").insert({
        user_id: userId, phone, phone_number: phone,
        direction: "outbound", role: "assistant",
        message: reply, content: reply,
        created_at: new Date().toISOString(),
      });
      return new Response("OK", { status: 200 });
    }

    // ── TEXT PROCESSING ──
    if (text) {
      const systemPrompt = buildSystemPrompt(ctx);

      const messages = (history?.reverse() || [])
        .slice(-6)
        .filter((m: any) => m.role && m.content)
        .map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));

      messages.push({ role: "user", content: text });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("[Claude] HTTP", response.status, errBody.slice(0, 500));
        await sendWhatsApp(
          phone,
          `Eita, ${ctx.name}! Tô com um probleminha pra pensar agora 🤯 Tenta de novo em alguns segundos, beleza?`,
        );
        return new Response("OK", { status: 200 });
      }

      const data = await response.json();
      console.log("[Claude] raw:", JSON.stringify(data).slice(0, 500));
      const aiText = data.content?.[0]?.text?.trim() || "";
      console.log("Claude response:", aiText.slice(0, 300));

      let finalReply = aiText;

      // Fallback: never send empty message to Z-API
      if (!finalReply || finalReply.length === 0) {
        finalReply = `Hmm, não consegui processar agora, ${ctx.name} 😅 Tenta reformular ou manda de novo em instantes!`;
      }

      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const action = JSON.parse(jsonMatch[0]);

          if (action.action === "expense" || action.action === "income") {
            const amount = parseFloat(action.amount);

            if (action.confirm) {
              await supabase.from("whatsapp_context").upsert({
                user_id: userId,
                pending_confirmation: true,
                pending_transactions: [{
                  type: action.action,
                  amount,
                  description: action.description,
                  category: action.category,
                }],
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id" });

              const typeLabel = action.action === "expense" ? "💸 Despesa" : "💰 Receita";
              finalReply = `⚠️ *Confirmar lançamento, ${ctx.name}?*\n\n${typeLabel}: *${fmt(amount)}*\n📝 ${action.description}\n📂 ${action.category}\n\nResponda *SIM* para confirmar ou *NÃO* para cancelar`;
            } else {
              const newBalance = action.action === "income"
                ? ctx.balance + amount
                : ctx.balance - amount;

              const { error } = await supabase.from("transactions").insert({
                user_id: userId,
                type: action.action,
                amount,
                description: action.description,
                category: action.category,
                date: new Date().toISOString().split("T")[0],
                origin: "personal",
                source: "whatsapp",
              });

              if (!error) {
                const typeEmoji = action.action === "expense" ? "💸" : "💰";
                const typeLabel = action.action === "expense" ? "Despesa" : "Receita";
                finalReply = `✅ *${typeLabel} registrada!*\n\n${typeEmoji} *${fmt(amount)}* — ${action.category}\n📝 ${action.description}\n📅 ${new Date().toLocaleDateString("pt-BR")}\n💰 Saldo: *${fmt(newBalance)}*\n\n_Kora IA 🐨_`;

                if (action.action === "expense") {
                  await checkAndAlertBudget(userId, phone, action.category, ctx.name, ctx, amount);
                }
              } else {
                console.error("Insert tx error:", error);
                finalReply = `❌ Erro ao salvar, ${ctx.name}. Tenta novamente!`;
              }
            }
          }
        }
      } catch (_e) {
        // Plain text reply, keep aiText as finalReply
      }

      await sendWhatsApp(phone, finalReply);

      await supabase.from("whatsapp_messages").insert({
        user_id: userId, phone, phone_number: phone,
        direction: "outbound", role: "assistant",
        message: finalReply, content: finalReply,
        created_at: new Date().toISOString(),
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

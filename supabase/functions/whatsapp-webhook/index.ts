import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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

async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
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
    return res.ok;
  } catch (e) {
    console.error("[Z-API SEND] EXCEPTION", e);
    return false;
  }
}

// Legado: mantido pra retrocompatibilidade caso outras funções importem.
// O novo fluxo de anexos usa `downloadAsBase64` (suporta PDF + imagem).
async function downloadImageBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const { base64, mimeType } = await downloadAsBase64(imageUrl);
  return { base64, mimeType };
}

// ─── AUDIO TRANSCRIPTION via Lovable AI Gateway (Gemini) ──
async function transcribeAudioWithGemini(audioUrl: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[AUDIO] LOVABLE_API_KEY missing");
    return null;
  }

  // Download audio from Z-API
  const audioRes = await fetch(audioUrl, { headers: { "Client-Token": ZAPI_CLIENT_TOKEN } });
  if (!audioRes.ok) {
    console.error("[AUDIO] download failed:", audioRes.status);
    return null;
  }
  const audioBuffer = await audioRes.arrayBuffer();
  const audioBytes = new Uint8Array(audioBuffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < audioBytes.length; i += chunk) {
    binary += String.fromCharCode(...audioBytes.subarray(i, i + chunk));
  }
  const audioBase64 = btoa(binary);
  const contentType = audioRes.headers.get("content-type") || "audio/ogg";
  const mimeType = contentType.includes("mpeg") ? "audio/mpeg"
    : contentType.includes("mp4") || contentType.includes("m4a") ? "audio/mp4"
    : contentType.includes("wav") ? "audio/wav"
    : "audio/ogg";

  console.log("[AUDIO] downloaded", audioBytes.length, "bytes,", mimeType);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Transcreva exatamente o que está sendo dito neste áudio em português brasileiro. Responda APENAS com a transcrição, sem comentários adicionais." },
          { type: "input_audio", input_audio: { data: audioBase64, format: mimeType.split("/")[1] } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[AUDIO] Gemini error:", response.status, errBody.slice(0, 500));
    return null;
  }

  const data = await response.json();
  const transcription = data.choices?.[0]?.message?.content?.trim();
  return transcription || null;
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

PARA EXPORTAR/ENVIAR RELATÓRIO (relatório, relatorio, exportar, planilha, extrato, pdf, csv, excel, "me manda", "me envia"):
Identifique formato e período. Responda APENAS com JSON:
{"action":"export","format":"summary|pdf|csv","period":"this_month|last_month|last_7_days|last_30_days|year","period_label":"texto humano curto"}
- format="summary" quando pedir apenas resumo/total
- format="pdf" quando pedir relatório, PDF, comprovante, detalhado
- format="csv" quando pedir planilha, excel, csv, tabela
- Se não citar período → "this_month"
- period_label ex: "este mês", "mês passado", "últimos 7 dias"

PARA PERGUNTAS FINANCEIRAS: responda com dados REAIS do contexto acima.

Exemplos:
- "quanto gastei?" → texto com dados reais
- "estou indo bem?" → analise balance, score, budgets
- "me manda o relatório do mês" → JSON action=export, format=pdf
- "exporta a planilha de outubro" → JSON action=export, format=csv

REGRAS:
- NUNCA invente números — use SEMPRE os dados acima
- Para registros e exports responda SOMENTE o JSON
- Para perguntas responda em texto simples
- Confirme gastos acima de R$500 antes de salvar`;
}

// ─── ATTACHMENT PROCESSING (PDF + Image) via Lovable AI Gemini ──
// Suporta: extratos bancários, faturas de cartão, comprovantes (Pix/TED/boleto), cupons.
// Importa DIRETO no banco e responde com resumo.
async function downloadAsBase64(url: string): Promise<{ base64: string; mimeType: string; bytes: number }> {
  const res = await fetch(url, { headers: { "Client-Token": ZAPI_CLIENT_TOKEN } });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let mimeType = ct.split(";")[0].trim();
  if (!mimeType || mimeType === "application/octet-stream") {
    // sniff via URL extension
    const lower = url.toLowerCase();
    if (lower.includes(".pdf")) mimeType = "application/pdf";
    else if (lower.includes(".png")) mimeType = "image/png";
    else if (lower.includes(".webp")) mimeType = "image/webp";
    else mimeType = "image/jpeg";
  }
  return { base64: btoa(binary), mimeType, bytes: bytes.length };
}

async function processAttachment(
  fileUrl: string,
  userName: string,
  defaultProfile: string,
): Promise<{ transactions: any[]; reply: string; importDirect: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return {
      transactions: [],
      reply: `Configuração da IA pendente, ${userName}. Tenta de novo em instantes!`,
      importDirect: false,
    };
  }

  try {
    const { base64, mimeType, bytes } = await downloadAsBase64(fileUrl);
    console.log(`[ATTACHMENT] ${mimeType} | ${(bytes / 1024).toFixed(1)} KB`);

    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");

    if (!isPdf && !isImage) {
      return {
        transactions: [],
        reply: `Não consigo ler esse tipo de arquivo (${mimeType}), ${userName} 😕\nManda PDF de extrato/fatura ou foto do comprovante!`,
        importDirect: false,
      };
    }

    const systemPrompt = `Você é a Kora IA, especialista em extrair transações financeiras de extratos bancários, faturas de cartão e comprovantes brasileiros.

Analise o documento e extraia TODAS as transações encontradas.

REGRAS DE CATEGORIZAÇÃO (use apenas estas):
- Alimentação, Supermercado, Delivery, Restaurante
- Transporte, Combustível, Uber/99
- Saúde, Farmácia, Plano de Saúde
- Lazer, Streaming, Viagem
- Casa, Aluguel, Contas (água/luz/internet)
- Educação, Cursos
- Vestuário, Eletrônicos
- Salário, Freelance, Investimentos, Vendas, Reembolso
- Cartão (pagamento de fatura)
- Transferência, Pix
- Empréstimo, Juros, Tarifas
- Outros

DETECÇÃO DE ORIGEM (origin):
- "business" se houver: CNPJ, nome de empresa fantasia, "LTDA", "ME", "EIRELI", taxa de maquininha, fornecedor, nota fiscal de serviço B2B
- "personal" para gastos pessoais (mercado, farmácia, salário, transferências entre pessoas físicas)
- Se ambíguo, use "${defaultProfile}"

REGRAS DE TIPO:
- "income" para créditos/entradas (recebimento, salário, depósito, Pix recebido, estorno)
- "expense" para débitos/saídas (compra, pagamento, Pix enviado, tarifa)

REGRAS DE DATA:
- Formato OBRIGATÓRIO: YYYY-MM-DD
- Se a data estiver dd/mm/aaaa, converta
- Se faltar ano, use o ano atual (${new Date().getFullYear()})
- Se faltar data completa, use a data de hoje: ${new Date().toISOString().split("T")[0]}

Responda APENAS JSON válido (sem markdown, sem comentários):
{
  "found": true,
  "doc_type": "extrato|fatura|comprovante|cupom",
  "institution": "nome do banco/empresa se identificado",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descrição limpa e curta",
      "amount": 123.45,
      "type": "expense",
      "category": "Categoria",
      "origin": "personal"
    }
  ]
}

Se não encontrar nenhuma transação:
{"found": false, "reason": "motivo curto"}`;

    const userContent: any[] = [
      { type: "text", text: "Extraia todas as transações financeiras deste documento e retorne o JSON conforme instruído." },
    ];

    if (isPdf) {
      userContent.push({
        type: "file",
        file: { filename: "documento.pdf", file_data: `data:application/pdf;base64,${base64}` },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[ATTACHMENT] Gemini error:", response.status, errBody.slice(0, 500));
      if (response.status === 429) {
        return { transactions: [], reply: `IA sobrecarregada agora, ${userName} 😅 Manda de novo em 1 minutinho!`, importDirect: false };
      }
      if (response.status === 402) {
        return { transactions: [], reply: `Limite de IA atingido. Avisa o admin pra recarregar créditos, ${userName}!`, importDirect: false };
      }
      return { transactions: [], reply: `Não consegui ler esse arquivo, ${userName}. Tenta de novo ou descreve em texto 📄`, importDirect: false };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

    if (!parsed.found || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
      return {
        transactions: [],
        reply: `Não identifiquei transações nesse arquivo, ${userName} 🤔\n${parsed.reason || "Confere se é um extrato/comprovante legível."}`,
        importDirect: false,
      };
    }

    // Sanitize transactions
    const today = new Date().toISOString().split("T")[0];
    const txs = parsed.transactions
      .map((t: any) => ({
        date: typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today,
        description: String(t.description || "Sem descrição").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: t.type === "income" ? "income" : "expense",
        category: String(t.category || "Outros").slice(0, 50),
        origin: t.origin === "business" ? "business" : "personal",
      }))
      .filter((t: any) => t.amount > 0);

    if (txs.length === 0) {
      return { transactions: [], reply: `Encontrei o documento mas as transações estão sem valor 🤷 Tenta um arquivo mais nítido!`, importDirect: false };
    }

    const income = txs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
    const expense = txs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
    const docLabel = parsed.doc_type ? `*${parsed.doc_type}*` : "documento";
    const inst = parsed.institution ? `\n🏦 ${parsed.institution}` : "";

    const preview = txs.slice(0, 5)
      .map((t: any) => `  ${t.type === "income" ? "💰" : "💸"} ${fmt(t.amount)} — ${t.category}`)
      .join("\n");
    const more = txs.length > 5 ? `\n  _...e mais ${txs.length - 5} lançamento(s)_` : "";

    const reply = `📄 *${docLabel.toUpperCase()} processado!*${inst}

${preview}${more}

📊 *Resumo:*
💰 Receitas: ${fmt(income)}
💸 Despesas: ${fmt(expense)}
📋 Total: *${txs.length} lançamento${txs.length > 1 ? "s" : ""}*

✅ Importando direto no seu dashboard, ${userName}...`;

    return { transactions: txs, reply, importDirect: true };
  } catch (e) {
    console.error("[ATTACHMENT] error:", e);
    return {
      transactions: [],
      reply: `Tive um problema lendo esse arquivo, ${userName} 😕 Tenta de novo ou manda foto do comprovante!`,
      importDirect: false,
    };
  }
}

// ─── FREQUENCY CONTROL ──────────────────────────────
// Brasil = UTC-3. 8h-21h BR = 11h-24h UTC.
function isWithinBrazilDaytime(): boolean {
  const utcHour = new Date().getUTCHours();
  // 8h BR = 11 UTC; 22h BR = 1 UTC (dia seguinte)
  // Permitido: 8h-21h59 BR → 11h UTC até 0h59 UTC
  return utcHour >= 11 || utcHour < 1;
}

async function canSendProactive(
  userId: string,
  category: string | null = null,
): Promise<{ allowed: boolean; reason?: string }> {
  if (!isWithinBrazilDaytime()) {
    return { allowed: false, reason: "outside-daytime" };
  }

  const { data: conn } = await supabase
    .from("whatsapp_connections")
    .select("active, last_notification_at, last_notification_category")
    .eq("user_id", userId)
    .maybeSingle();

  if (!conn || conn.active === false) {
    return { allowed: false, reason: "inactive" };
  }

  if (conn.last_notification_at) {
    const last = new Date(conn.last_notification_at).getTime();
    const diffH = (Date.now() - last) / (1000 * 60 * 60);
    if (diffH < 2) return { allowed: false, reason: "throttled-2h" };

    // Mesma categoria no mesmo dia → bloqueia
    if (category && conn.last_notification_category === category) {
      const sameDay =
        new Date(conn.last_notification_at).toISOString().slice(0, 10) ===
        new Date().toISOString().slice(0, 10);
      if (sameDay) return { allowed: false, reason: "same-category-today" };
    }
  }

  return { allowed: true };
}

async function markNotificationSent(userId: string, category: string | null = null) {
  await supabase
    .from("whatsapp_connections")
    .update({
      last_notification_at: new Date().toISOString(),
      last_notification_category: category,
    })
    .eq("user_id", userId);
}

// ─── IMPROVEMENT 4: PROACTIVE BUDGET ALERTS ─────────
async function checkAndAlertBudget(
  userId: string,
  phone: string,
  category: string,
  userName: string,
  ctx: any,
  addedAmount: number,
) {
  const budget = ctx.budgets.find((b: any) => b.category === category);
  if (!budget) return;

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

  if (!alertMsg) return;

  const check = await canSendProactive(userId, category);
  if (!check.allowed) {
    console.log(`[BUDGET ALERT skipped] user=${userId} reason=${check.reason}`);
    return;
  }

  await new Promise((r) => setTimeout(r, 1500));
  const ok = await sendWhatsApp(phone, alertMsg);
  if (ok) await markNotificationSent(userId, category);
}

// ─── IMPROVEMENT 5: MAIN HANDLER ────────────────────
serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  // Authenticate the webhook: Z-API sends the same Client-Token we configured
  // in their dashboard. Reject anything that doesn't match.
  const sentToken = req.headers.get("client-token");
  if (!ZAPI_CLIENT_TOKEN || sentToken !== ZAPI_CLIENT_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    console.log("Z-API payload:", JSON.stringify(body).slice(0, 500));

    if (body.fromMe || body.isGroup) return new Response("OK", { status: 200 });

    // ── DEDUP: evita processar o mesmo webhook 2x (Z-API às vezes reentrega) ──
    const messageId = body.messageId || body.id || body.key?.id;
    if (messageId) {
      const { error: dedupErr } = await supabase
        .from("whatsapp_webhook_dedup")
        .insert({ message_id: String(messageId) });
      if (dedupErr) {
        // 23505 = unique violation → já processado
        if ((dedupErr as unknown as { code?: string }).code === "23505") {
          console.log(`[DEDUP] skipping duplicate messageId=${messageId}`);
          return new Response("OK", { status: 200 });
        }
        console.error("[DEDUP] insert error:", dedupErr);
      }
    }

    const phone = (body.phone || "")
      .replace("@s.whatsapp.net", "")
      .replace("@c.us", "")
      .replace(/\D/g, "");
    let text = body.text?.message?.trim();
    const image = body.image || body.imageMessage;
    const audio = body.audio || body.audioMessage;
    // Z-API document/PDF payload variants
    const document = body.document || body.documentMessage || body.documentWithCaption || body.documentWithCaptionMessage;

    if (!phone) return new Response("OK", { status: 200 });

    // ── AUDIO TRANSCRIPTION (Z-API) ──
    if (audio && !text) {
      const audioUrl = typeof audio === "string" ? audio : (audio.audioUrl || audio.url);
      console.log("[AUDIO] received, url:", audioUrl);
      try {
        const transcribed = await transcribeAudioWithGemini(audioUrl);
        if (transcribed) {
          text = transcribed;
          console.log("[AUDIO] transcribed:", text.slice(0, 200));
        } else {
          await sendWhatsApp(phone, `Não consegui ouvir seu áudio agora 🎤 Pode mandar em texto?`);
          return new Response("OK", { status: 200 });
        }
      } catch (e) {
        console.error("[AUDIO] error:", e);
        await sendWhatsApp(phone, `Tive um problema pra entender seu áudio 🎤 Manda em texto, por favor!`);
        return new Response("OK", { status: 200 });
      }
    }

    // Build phone variants to handle BR mobile 9-digit variation + with/without country code
    // Z-API may send: 5581995693581 (13d), 558195693581 (12d, no 9), 81995693581 (no 55), etc.
    const variants = new Set<string>([phone]);
    // strip leading 55 if present
    const noCC = phone.startsWith("55") ? phone.slice(2) : phone;
    variants.add(noCC);
    variants.add("55" + noCC);
    // BR mobile: DDD (2) + [9]? + 8 digits  → toggle the leading 9
    if (noCC.length === 11 && noCC[2] === "9") {
      const without9 = noCC.slice(0, 2) + noCC.slice(3); // 10 digits
      variants.add(without9);
      variants.add("55" + without9);
    } else if (noCC.length === 10) {
      const with9 = noCC.slice(0, 2) + "9" + noCC.slice(2); // 11 digits
      variants.add(with9);
      variants.add("55" + with9);
    }
    const orFilter = Array.from(variants).map(v => `phone_number.eq.${v}`).join(",");
    console.log("[WA LOOKUP] phone:", phone, "variants:", Array.from(variants).join("|"));

    const { data: conn } = await supabase
      .from("whatsapp_connections")
      .select("user_id, phone_number")
      .or(orFilter)
      .eq("verified", true)
      .maybeSingle();

    console.log("[WA LOOKUP] result:", conn ? `found user=${conn.user_id} stored=${conn.phone_number}` : "NOT FOUND");

    if (!conn?.user_id) {
      await sendWhatsApp(phone,
        `👋 Olá! Sou a *Kora IA* do KoraFinance 🐨\n\nPara usar o assistente, conecte seu número:\n\n1️⃣ Acesse *korafinance.app*\n2️⃣ Configurações → WhatsApp\n3️⃣ Informe este número\n\nDepois é só mandar:\n💸 _"gastei 50 no mercado"_\n📷 _Foto do comprovante_\n📄 _PDF do extrato ou fatura_`
      );
      return new Response("OK", { status: 200 });
    }

    const userId = conn.user_id;
    const ctx = await loadUserContext(userId);

    const inboundLabel = text || (document ? "[documento]" : image ? "[imagem]" : audio ? "[áudio]" : "[mídia]");
    await supabase.from("whatsapp_messages").insert({
      user_id: userId,
      phone,
      phone_number: phone,
      direction: "inbound",
      role: "user",
      message: inboundLabel,
      content: inboundLabel,
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

    // ── ATTACHMENT PROCESSING (PDF de extrato/fatura/comprovante OU imagem) ──
    // Importa DIRETO no banco, sem confirmação. Detecta origem (personal/business) via IA.
    if (document || image) {
      let fileUrl: string | undefined;
      if (document) {
        fileUrl = typeof document === "string"
          ? document
          : (document.documentUrl || document.url || document.fileUrl);
      } else if (image) {
        fileUrl = typeof image === "string"
          ? image
          : (image.imageUrl || image.url);
      }

      if (!fileUrl) {
        await sendWhatsApp(phone, `Não consegui baixar o arquivo, ${ctx.name} 😕 Tenta enviar de novo!`);
        return new Response("OK", { status: 200 });
      }

      const { transactions, reply, importDirect } = await processAttachment(fileUrl, ctx.name, ctx.profile);

      // Sempre envia o resumo primeiro
      await sendWhatsApp(phone, reply);
      await supabase.from("whatsapp_messages").insert({
        user_id: userId, phone, phone_number: phone,
        direction: "outbound", role: "assistant",
        message: reply, content: reply,
        created_at: new Date().toISOString(),
      });

      // Importa direto se a IA achou transações válidas
      if (importDirect && transactions.length > 0) {
        const rows = transactions.map((t: any) => ({
          user_id: userId,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          date: t.date,
          origin: t.origin || ctx.profile || "personal",
          source: "whatsapp",
        }));

        // Insert em chunks de 50
        let saved = 0;
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          const { error } = await supabase.from("transactions").insert(chunk);
          if (error) {
            console.error("[ATTACHMENT INSERT] error:", error.message);
          } else {
            saved += chunk.length;
          }
        }

        const incomeTotal = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
        const expenseTotal = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);

        const confirmReply = `🎉 *Importação concluída!*

✅ *${saved} de ${transactions.length}* lançamento${saved > 1 ? "s" : ""} salvos
💰 +${fmt(incomeTotal)}
💸 -${fmt(expenseTotal)}
📊 Líquido: *${fmt(incomeTotal - expenseTotal)}*

Acesse seu dashboard pra revisar e ajustar categorias se quiser, ${ctx.name}! 🐨`;

        await sendWhatsApp(phone, confirmReply);
        await supabase.from("whatsapp_messages").insert({
          user_id: userId, phone, phone_number: phone,
          direction: "outbound", role: "assistant",
          message: confirmReply, content: confirmReply,
          created_at: new Date().toISOString(),
        });

        // Alerta orçamento agrupado por categoria
        const byCat: Record<string, number> = {};
        for (const tx of transactions) {
          if (tx.type === "expense") {
            byCat[tx.category] = (byCat[tx.category] || 0) + Number(tx.amount);
          }
        }
        const freshCtx = await loadUserContext(userId);
        for (const [cat, amt] of Object.entries(byCat)) {
          await checkAndAlertBudget(userId, phone, cat, ctx.name, freshCtx, amt);
        }
      }

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

      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 600,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("[Anthropic] HTTP", response.status, errBody.slice(0, 500));
        const fallback = response.status === 429
          ? `Tô recebendo muitas mensagens agora, ${ctx.name} 😅 Espera 1 minutinho e manda de novo!`
          : `Eita, ${ctx.name}! Tô com um probleminha pra pensar agora 🤯 Tenta de novo em alguns segundos.`;
        await sendWhatsApp(phone, fallback);
        return new Response("OK", { status: 200 });
      }

      const data = await response.json();
      const aiText = (data.content?.[0]?.text || "").trim();
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

          if (action.action === "export") {
            // Compute date range from period
            const today = new Date();
            const y = today.getFullYear();
            const m = today.getMonth();
            let startDate: string;
            let endDate: string;
            let periodLabel = action.period_label || "este mês";

            switch (action.period) {
              case "last_month": {
                startDate = new Date(y, m - 1, 1).toISOString().slice(0, 10);
                endDate = new Date(y, m, 0).toISOString().slice(0, 10);
                if (!action.period_label) periodLabel = "mês passado";
                break;
              }
              case "last_7_days": {
                const s = new Date(); s.setDate(s.getDate() - 7);
                startDate = s.toISOString().slice(0, 10);
                endDate = today.toISOString().slice(0, 10);
                if (!action.period_label) periodLabel = "últimos 7 dias";
                break;
              }
              case "last_30_days": {
                const s = new Date(); s.setDate(s.getDate() - 30);
                startDate = s.toISOString().slice(0, 10);
                endDate = today.toISOString().slice(0, 10);
                if (!action.period_label) periodLabel = "últimos 30 dias";
                break;
              }
              case "year": {
                startDate = new Date(y, 0, 1).toISOString().slice(0, 10);
                endDate = new Date(y, 11, 31).toISOString().slice(0, 10);
                if (!action.period_label) periodLabel = `${y}`;
                break;
              }
              default: {
                startDate = new Date(y, m, 1).toISOString().slice(0, 10);
                endDate = new Date(y, m + 1, 0).toISOString().slice(0, 10);
                if (!action.period_label) periodLabel = "este mês";
              }
            }

            const fmt = (action.format || "summary") as string;
            const ack = fmt === "summary"
              ? `📊 Gerando o resumo de *${periodLabel}*, ${ctx.name}...`
              : fmt === "csv"
              ? `📋 Preparando sua planilha de *${periodLabel}*, ${ctx.name}...`
              : `📄 Gerando o PDF de *${periodLabel}*, ${ctx.name}...`;
            await sendWhatsApp(phone, ack);

            // Fire-and-forget: chama whatsapp-export sem aguardar
            fetch(`${SUPABASE_URL}/functions/v1/whatsapp-export`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
              body: JSON.stringify({
                userId,
                phone,
                format: fmt,
                startDate,
                endDate,
                periodLabel,
              }),
            }).catch((err) => console.error("[export invoke] error:", err));

            await supabase.from("whatsapp_messages").insert({
              user_id: userId, phone, phone_number: phone,
              direction: "outbound", role: "assistant",
              message: ack, content: ack,
              created_at: new Date().toISOString(),
            });
            return new Response("OK", { status: 200 });
          }

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

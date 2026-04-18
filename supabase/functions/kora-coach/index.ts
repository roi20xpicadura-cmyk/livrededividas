// supabase/functions/kora-coach/index.ts
//
// KORA COACH — análise estratégica profunda com Opus 4.7.
// Usa o helper de rate-limit: se atingir cota Opus ou circuit breaker,
// rebaixa pra Sonnet transparentemente ou rejeita 429.
// Plano Free NUNCA chega aqui com Opus — sempre Haiku (coaching "lite").
//
// Casos de uso:
//   - Chamada direta do usuário ("Análise profunda" button)
//   - Evento automático (3 meses seguidos no negativo, etc.) via service_role
//
// Produto:
//   - Cria plano com status='pending' em kora_coaching_plans
//   - Plano só ativa quando usuário confirmar via kora-confirm-action
//     (trigger: action_type='create_coaching_plan' → promove status pra 'active')

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  authenticateKoraRequest,
  assertKoraV2Enabled,
  koraAuthErrorResponse,
  KoraAuthError,
} from "../_shared/kora-auth.ts";
import {
  getUserContext,
  buildContextPrompt,
} from "../_shared/kora-memory.ts";
import { PERSONAS } from "../_shared/kora-personas.ts";
import {
  checkRateLimits,
  incrementOpusUsage,
} from "../_shared/kora-limits.ts";
import {
  callAnthropic,
} from "../_shared/kora-llm.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CoachType =
  | "debt_payoff_analysis"
  | "budget_recovery_plan"
  | "savings_strategy"
  | "goal_feasibility"
  | "free_consultation"
  | "plan_checkin";

interface CoachRequest {
  user_id?: string;
  coach_type: CoachType;
  user_question?: string;
  specific_goal_id?: string;
  specific_debt_id?: string;
  checkin_plan_id?: string;
}

interface CoachPhase {
  phase: number;
  title: string;
  duration_months?: number;
  target?: string;
  steps: string[];
}

interface CoachProposedPlan {
  id?: string | null;
  title: string;
  description: string;
  horizon_months?: number;
  phases: CoachPhase[];
  key_metrics?: Record<string, unknown>;
}

interface CoachAlternative {
  name: string;
  tradeoff: string;
}

interface CoachResponse {
  success: boolean;
  analysis: string;
  proposed_plan?: CoachProposedPlan | null;
  proposed_plan_action_id?: string | null;
  risks: string[];
  alternative_paths?: CoachAlternative[];
  next_steps: string[];
  model_used: string | null;
  cost_usd: number;
  error?: string;
}

const COACH_SYSTEM_PROMPT = `Você é a Kora, consultora financeira sênior do KoraFinance. Este é o COACHING PROFUNDO — raciocínio estratégico com tempo e atenção máxima.

Voz:
- Consultora experiente, séria mas próxima. Não é terapeuta, não é vendedora.
- Trata o usuário como adulto capaz de decidir.
- Sem clichês motivacionais. Sem jargão técnico desnecessário.
- Português brasileiro natural. Valores "R$ 1.234,56". Prosa, não listas exaustivas.

Método:
1. DIAGNÓSTICO: número real da situação. Matemática precisa.
2. CONTEXTO PSICOLÓGICO: use perfil do usuário (traits) pra calibrar.
3. TRADE-OFFS: 2-3 caminhos honestos, não um único "certo".
4. PLANO EM FASES: próximos 30 dias, 3 meses, 12 meses. Pequenas vitórias.
5. MÉTRICAS: indicadores claros por fase.
6. RISCOS: o que pode dar errado e como o plano se adapta.

Regras:
- Muitas dívidas → avalanche (maior juros) vs bola de neve (menor valor). Recomende baseado em perfil.
- trait_planner < 0.4 → orçamentos flexíveis, micro-compromissos.
- Ansioso/emocional → calma + primeiro passo. Não sobrecarregue.
- Dívida > 12x renda ou contas essenciais atrasadas → estabilização antes de otimização.
- Casal: preserve autonomia individual dentro do plano conjunto.
- Negócio: separe PF/PJ; considere pro-labore, capital de giro.

Formato: responda APENAS um JSON válido:
{
  "analysis": "Análise textual (3-5 parágrafos, prosa, tom de consultora)",
  "proposed_plan": {
    "title": "Título curto",
    "description": "1 frase resumo",
    "horizon_months": número,
    "phases": [
      { "phase": 1, "title": "Nome", "duration_months": 1, "target": "meta", "steps": ["...", "..."] }
    ],
    "key_metrics": { "nome": "valor" }
  },
  "risks": ["risco 1", "risco 2"],
  "alternative_paths": [ { "name": "Caminho X", "tradeoff": "ganha X, perde Y" } ],
  "next_steps": ["passo imediato 1", "passo imediato 2"]
}

Se for só consulta livre (sem necessidade de plano), "proposed_plan" pode ser null.
Sem markdown. Sem \`\`\`. Só o JSON.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse(errorResponse("ANTHROPIC_API_KEY not configured"), 500);
  }

  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return jsonResponse(errorResponse("invalid json body"), 400);
  }

  let authCtx;
  try {
    authCtx = await authenticateKoraRequest(req, supabase, body.user_id);
    assertKoraV2Enabled(authCtx);
  } catch (err) {
    if (err instanceof KoraAuthError) return koraAuthErrorResponse(err);
    return jsonResponse(errorResponse("auth_failed"), 500);
  }

  try {
    // Rate limit (Opus → potencialmente Sonnet ou Haiku)
    const limitDecision = await checkRateLimits({
      userId: authCtx.userId,
      plan: authCtx.plan,
      persona: "coach",
      desiredModel: "opus-4-7",
      supabase,
    });

    if (limitDecision.blocked) {
      return jsonResponse(
        {
          ...errorResponse("rate_limited"),
          analysis: limitDecision.userMessage ?? "Serviço de coaching temporariamente indisponível.",
        },
        429,
      );
    }

    const effectiveModel = limitDecision.effectiveModel;

    // Contexto + dados financeiros aprofundados
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const context = await getUserContext(sb, authCtx.userId);
    const financials = await loadDeepFinancials(sb, authCtx.userId);
    const specific = await loadSpecificData(sb, body);

    const contextSection = buildContextPrompt(context);
    const financialSection = formatDeepFinancialContext(financials);
    const specificSection = formatSpecificData(specific);

    const systemPrompt = [
      COACH_SYSTEM_PROMPT,
      contextSection,
      "=== DADOS FINANCEIROS DETALHADOS ===",
      financialSection,
      specificSection,
      `=== TIPO DE COACHING SOLICITADO ===\n${body.coach_type}`,
    ].join("\n\n");

    const userMessage = body.user_question ?? defaultPromptFor(body.coach_type);

    // Quando degradado pra Haiku no Free, reduz max_tokens pra não desperdiçar
    const maxTokens = effectiveModel === "haiku-4-5" ? 800 : PERSONAS.coach.maxTokens;

    const aiResult = await callAnthropic({
      model: effectiveModel,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens,
      anthropicKey,
    });

    // Parse resposta JSON; fallback: texto bruto em `analysis`
    const textBlock = aiResult.content.find((b) => b.type === "text");
    const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
    const clean = rawText.replace(/^```(json)?|```$/gm, "").trim();

    let coachOutput: {
      analysis?: string;
      proposed_plan?: CoachProposedPlan | null;
      risks?: string[];
      alternative_paths?: CoachAlternative[];
      next_steps?: string[];
    };
    try {
      coachOutput = JSON.parse(clean);
    } catch {
      console.error("[kora-coach] JSON parse failed:", rawText.slice(0, 300));
      coachOutput = { analysis: rawText, proposed_plan: null, risks: [], next_steps: [] };
    }

    // Se tem plano proposto, grava em kora_coaching_plans (status='pending')
    // + kora_actions com action_type='create_coaching_plan' (pending).
    // Usuário confirma via kora-confirm-action → promove plano pra active.
    let planId: string | null = null;
    let actionId: string | null = null;

    if (coachOutput.proposed_plan && authCtx.plan !== "free") {
      const plan = coachOutput.proposed_plan;
      const targetDate = plan.horizon_months
        ? new Date(Date.now() + plan.horizon_months * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)
        : null;

      const steps = (plan.phases ?? []).flatMap((phase, pIdx) =>
        (phase.steps ?? []).map((stepText, sIdx) => ({
          id: `p${pIdx + 1}_s${sIdx + 1}`,
          phase: phase.phase,
          phase_title: phase.title,
          title: stepText,
          target_value: null,
          deadline: null,
          status: "pending",
        })),
      );

      const { data: planRow } = await supabase
        .from("kora_coaching_plans")
        .insert({
          user_id: authCtx.userId,
          plan_type: mapCoachTypeToPlanType(body.coach_type),
          title: plan.title,
          description: plan.description,
          target_date: targetDate,
          duration_days: plan.horizon_months ? plan.horizon_months * 30 : null,
          steps,
          target_metrics: plan.key_metrics ?? {},
          status: "pending",
          checkin_frequency: "weekly",
        })
        .select("id")
        .single();

      if (planRow && typeof planRow.id === "string") {
        planId = planRow.id;

        const { data: actionRow } = await supabase
          .from("kora_actions")
          .insert({
            user_id: authCtx.userId,
            action_type: "create_coaching_plan",
            status: "pending",
            payload: { plan_id: planId, coach_type: body.coach_type },
            reasoning: `Plano gerado pelo Coach (${body.coach_type}). Aguarda confirmação.`,
          })
          .select("id")
          .single();
        if (actionRow && typeof actionRow.id === "string") {
          actionId = actionRow.id;
        }
      }
    }

    // Log da interação
    await supabase.from("kora_interactions").insert({
      user_id: authCtx.userId,
      channel: "app",
      input_type: "text",
      persona: "coach",
      user_message: body.user_question ?? `[coaching: ${body.coach_type}]`,
      kora_response: coachOutput.analysis ?? "",
      model_used: effectiveModel,
      input_tokens: aiResult.inputTokens,
      output_tokens: aiResult.outputTokens,
      cost_usd: aiResult.costUsd,
      triggered_action_ids: actionId ? [actionId] : null,
      metadata: {
        coach_type: body.coach_type,
        plan_created: planId !== null,
        plan_id: planId,
        degraded: limitDecision.degraded,
        downgrade_warnings: limitDecision.warnings,
      },
    });

    // Incrementa cota Opus só se Opus foi realmente usado
    if (effectiveModel === "opus-4-7") {
      await incrementOpusUsage(supabase, authCtx.userId);
    }

    // Resposta final. Se degradado com mensagem, prepend ao analysis.
    let analysis = coachOutput.analysis ?? "";
    if (limitDecision.userMessage && limitDecision.degraded) {
      analysis = `${limitDecision.userMessage}\n\n${analysis}`.trim();
    }

    const response: CoachResponse = {
      success: true,
      analysis,
      proposed_plan:
        coachOutput.proposed_plan && planId
          ? { ...coachOutput.proposed_plan, id: planId }
          : coachOutput.proposed_plan ?? null,
      proposed_plan_action_id: actionId,
      risks: coachOutput.risks ?? [],
      alternative_paths: coachOutput.alternative_paths ?? [],
      next_steps: coachOutput.next_steps ?? [],
      model_used: effectiveModel,
      cost_usd: aiResult.costUsd,
    };
    return jsonResponse(response);
  } catch (err) {
    console.error("[kora-coach] error:", err);
    return jsonResponse(
      errorResponse(err instanceof Error ? err.message : "internal error"),
      500,
    );
  }
});

// ==========================================================
// HELPERS
// ==========================================================

interface DeepFinancials {
  transactions_6m: Array<{ amount: number; type: string; category: string; date: string }>;
  debts: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  budgets: Array<{ category: string; limit_amount: number | string }>;
}

async function loadDeepFinancials(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<DeepFinancials> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    .toISOString()
    .slice(0, 10);

  const [txs, debts, goals, budgets] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, category, date")
      .eq("user_id", userId)
      .gte("date", sixMonthsAgo)
      .is("deleted_at", null),
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase.from("goals").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("budgets").select("category, limit_amount").eq("user_id", userId),
  ]);

  return {
    transactions_6m: (txs.data ?? []) as DeepFinancials["transactions_6m"],
    debts: (debts.data ?? []) as DeepFinancials["debts"],
    goals: (goals.data ?? []) as DeepFinancials["goals"],
    budgets: (budgets.data ?? []) as DeepFinancials["budgets"],
  };
}

async function loadSpecificData(
  supabase: ReturnType<typeof createClient>,
  body: CoachRequest,
): Promise<{
  focused_debt?: Record<string, unknown> | null;
  focused_goal?: Record<string, unknown> | null;
  plan_being_reviewed?: Record<string, unknown> | null;
}> {
  const out: {
    focused_debt?: Record<string, unknown> | null;
    focused_goal?: Record<string, unknown> | null;
    plan_being_reviewed?: Record<string, unknown> | null;
  } = {};

  if (body.specific_debt_id) {
    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("id", body.specific_debt_id)
      .maybeSingle();
    out.focused_debt = (data as Record<string, unknown> | null) ?? null;
  }
  if (body.specific_goal_id) {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("id", body.specific_goal_id)
      .maybeSingle();
    out.focused_goal = (data as Record<string, unknown> | null) ?? null;
  }
  if (body.checkin_plan_id) {
    const { data } = await supabase
      .from("kora_coaching_plans")
      .select("*")
      .eq("id", body.checkin_plan_id)
      .maybeSingle();
    out.plan_being_reviewed = (data as Record<string, unknown> | null) ?? null;
    // Atualiza last_checkin_at do plano
    if (out.plan_being_reviewed) {
      await supabase
        .from("kora_coaching_plans")
        .update({ last_checkin_at: new Date().toISOString() })
        .eq("id", body.checkin_plan_id);
    }
  }
  return out;
}

function formatDeepFinancialContext(data: DeepFinancials): string {
  const brl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const txs = data.transactions_6m;
  const monthlyAgg = new Map<string, { income: number; expense: number }>();
  for (const tx of txs) {
    const month = tx.date.slice(0, 7);
    const m = monthlyAgg.get(month) ?? { income: 0, expense: 0 };
    if (tx.type === "income") m.income += Number(tx.amount);
    else m.expense += Number(tx.amount);
    monthlyAgg.set(month, m);
  }

  const months = [...monthlyAgg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([m, v]) =>
        `${m}: receita ${brl(v.income)}, despesa ${brl(v.expense)}, saldo ${brl(v.income - v.expense)}`,
    );

  const incomes = [...monthlyAgg.values()].map((m) => m.income);
  const expenses = [...monthlyAgg.values()].map((m) => m.expense);
  const avgIncome = incomes.reduce((s, v) => s + v, 0) / (incomes.length || 1);
  const avgExpense = expenses.reduce((s, v) => s + v, 0) / (expenses.length || 1);

  const parts: string[] = [];
  if (months.length > 0) parts.push(`Histórico 6 meses:\n${months.join("\n")}`);
  parts.push(
    `\nMédia mensal: receita ${brl(avgIncome)}, despesa ${brl(avgExpense)}, saldo ${brl(avgIncome - avgExpense)}.`,
  );

  if (data.debts.length > 0) {
    parts.push(`\nDívidas ativas:`);
    let totalDebt = 0;
    for (const d of data.debts) {
      const remaining = Number(d.remaining_amount);
      totalDebt += remaining;
      const juros = d.interest_rate ? ` (${d.interest_rate}% a.m.)` : "";
      parts.push(`- ${String(d.name)}: ${brl(remaining)} restantes${juros}`);
    }
    parts.push(
      `Total: ${brl(totalDebt)} — ${(totalDebt / (avgIncome || 1)).toFixed(1)}x a renda média.`,
    );
  }

  if (data.goals.length > 0) {
    parts.push(`\nMetas:`);
    for (const g of data.goals) {
      const cur = Number(g.current_amount);
      const tgt = Number(g.target_amount);
      const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
      parts.push(
        `- ${String(g.name)}: ${brl(cur)}/${brl(tgt)} (${pct}%)${g.deadline ? `, prazo ${String(g.deadline)}` : ""}`,
      );
    }
  }

  if (data.budgets.length > 0) {
    parts.push(
      `\nOrçamentos ativos: ${data.budgets
        .map((b) => `${b.category} = ${brl(Number(b.limit_amount))}`)
        .join(", ")}`,
    );
  }

  return parts.join("\n");
}

function formatSpecificData(data: {
  focused_debt?: Record<string, unknown> | null;
  focused_goal?: Record<string, unknown> | null;
  plan_being_reviewed?: Record<string, unknown> | null;
}): string {
  const parts: string[] = [];
  if (data.focused_debt) parts.push(`=== DÍVIDA EM FOCO ===\n${JSON.stringify(data.focused_debt, null, 2)}`);
  if (data.focused_goal) parts.push(`=== META EM FOCO ===\n${JSON.stringify(data.focused_goal, null, 2)}`);
  if (data.plan_being_reviewed)
    parts.push(`=== PLANO SENDO REVISADO ===\n${JSON.stringify(data.plan_being_reviewed, null, 2)}`);
  return parts.join("\n\n");
}

function defaultPromptFor(type: CoachType): string {
  switch (type) {
    case "debt_payoff_analysis":
      return "Analise minhas dívidas e proponha um plano de quitação considerando meus gastos, renda e perfil.";
    case "budget_recovery_plan":
      return "Estou no vermelho. Preciso de um plano pra recuperar o controle.";
    case "savings_strategy":
      return "Quero uma estratégia de poupança realista pra minha situação.";
    case "goal_feasibility":
      return "Analise a viabilidade da minha meta atual.";
    case "plan_checkin":
      return "Faz um check-in do meu plano de coaching ativo: estou no caminho? Ajustar algo?";
    case "free_consultation":
    default:
      return "Me ajude a pensar estrategicamente sobre minhas finanças.";
  }
}

function mapCoachTypeToPlanType(coachType: CoachType): string {
  const map: Record<CoachType, string> = {
    debt_payoff_analysis: "debt_payoff",
    budget_recovery_plan: "budget_recovery",
    savings_strategy: "savings",
    goal_feasibility: "goal_achievement",
    plan_checkin: "financial_education",
    free_consultation: "financial_education",
  };
  return map[coachType] ?? "financial_education";
}

function errorResponse(error: string): CoachResponse {
  return {
    success: false,
    analysis: "",
    risks: [],
    next_steps: [],
    model_used: null,
    cost_usd: 0,
    error,
  };
}

function jsonResponse(body: CoachResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

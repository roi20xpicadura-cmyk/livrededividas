// supabase/functions/kora-brain/index.ts
//
// KORA BRAIN — orquestrador central da Kora v2.
// Entrada principal pra texto (app ou WhatsApp via webhook), imagem e
// triggers automáticos. Coexiste com ai-chat (ai-chat NÃO é tocado).
//
// Fluxo:
//   1. Autentica (JWT ou service_role) + checa feature flag kora_v2_enabled
//   2. Carrega contexto (memórias, perfil, planos) + snapshot financeiro
//   3. Seleciona persona heurística
//   4. Aplica rate limits (downgrade Opus→Sonnet no Free/sem cota, circuit breaker)
//   5. Chama Anthropic com tools filtradas por plano
//   6. Loga interação + executa tools (auto ou pending)
//   7. Incrementa contadores de uso (se Opus foi usado mesmo)
//   8. Fire-and-forget: extrai novas memórias (só Pro/Business)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  authenticateKoraRequest,
  assertKoraV2Enabled,
  koraAuthErrorResponse,
  KoraAuthError,
  type KoraAuthContext,
} from "../_shared/kora-auth.ts";
import {
  selectPersona,
  type PersonaKey,
  type ModelKey,
} from "../_shared/kora-personas.ts";
import {
  getUserContext,
  buildContextPrompt,
  addMemory,
  extractMemoriesFromInteraction,
  type KoraUserContext,
} from "../_shared/kora-memory.ts";
import {
  KORA_TOOLS,
  filterToolsByPlan,
  executeTool,
  describeAction,
  categoriesPromptSnippet,
} from "../_shared/kora-tools.ts";
import {
  checkRateLimits,
  incrementOpusUsage,
} from "../_shared/kora-limits.ts";
import {
  callAnthropic,
  parseAnthropicResult,
  type AnthropicContentBlock,
  type AnthropicMessage,
} from "../_shared/kora-llm.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BrainRequest {
  user_id?: string;
  channel: "app" | "whatsapp" | "email" | "system";
  input_type: "text" | "audio" | "image" | "trigger";
  message?: string;
  image_base64?: string;
  image_media_type?: string;
  trigger_context?: Record<string, unknown>;
  explicit_persona?: PersonaKey;
}

interface PendingActionOut {
  action_id: string;
  description: string;
  tool: string;
  input: Record<string, unknown>;
}

interface ExecutedActionOut {
  tool: string;
  result: Record<string, unknown>;
}

interface BrainResponse {
  success: boolean;
  response_text: string;
  persona_used: PersonaKey;
  model_used: ModelKey | null;
  pending_actions: PendingActionOut[];
  executed_actions: ExecutedActionOut[];
  cost_usd: number;
  interaction_id?: string | null;
  warnings?: string[];
  error?: string;
}

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
    return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body: BrainRequest;
  try {
    body = (await req.json()) as BrainRequest;
  } catch {
    return jsonResponse({ success: false, error: "invalid json body" }, 400);
  }

  let authCtx: KoraAuthContext;
  try {
    authCtx = await authenticateKoraRequest(req, supabase, body.user_id);
    assertKoraV2Enabled(authCtx);
  } catch (err) {
    if (err instanceof KoraAuthError) return koraAuthErrorResponse(err);
    return jsonResponse({ success: false, error: "auth_failed" }, 500);
  }

  const userId = authCtx.userId;

  try {
    // ─── 1. Contexto ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const context = await getUserContext(sb, userId);
    const financialSnapshot = await loadFinancialSnapshot(sb, userId);

    // ─── 2. Persona ─────────────────────────────────────
    const triggerType =
      body.input_type === "trigger"
        ? (body.trigger_context?.trigger_type as "alert" | "summary" | null)
        : null;

    const persona = selectPersona({
      userMessage: body.message,
      triggerType,
      userContext: {
        has_couple_mode: Boolean(
          (context.profile?.life_context as Record<string, unknown> | undefined)?.has_couple_mode,
        ),
        has_business_context:
          financialSnapshot.profile_type === "business" ||
          financialSnapshot.profile_type === "both" ||
          Boolean(
            (context.profile?.life_context as Record<string, unknown> | undefined)?.is_mei,
          ),
        total_debt: financialSnapshot.total_debt,
        recent_negative_balance: financialSnapshot.recent_balance < 0,
      },
      explicitPersona: body.explicit_persona,
    });

    // ─── 3. Rate limit / circuit breaker ───────────────
    const limitDecision = await checkRateLimits({
      userId,
      plan: authCtx.plan,
      persona: persona.key,
      desiredModel: persona.model,
      supabase,
    });

    if (limitDecision.blocked) {
      return jsonResponse(
        {
          success: false,
          response_text: limitDecision.userMessage ?? "Serviço temporariamente indisponível.",
          persona_used: persona.key,
          model_used: null,
          pending_actions: [],
          executed_actions: [],
          cost_usd: 0,
          warnings: limitDecision.warnings,
          error: "rate_limited",
        } satisfies BrainResponse,
        429,
      );
    }

    const effectiveModel = limitDecision.effectiveModel;

    // ─── 4. System prompt ──────────────────────────────
    const contextPrompt = buildContextPrompt(context);
    const financialContext = formatFinancialContext(financialSnapshot);
    const origin =
      financialSnapshot.profile_type === "business" ? "business" : "personal";
    const categoriesHint = categoriesPromptSnippet(origin);

    const today = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const fullSystemPrompt = [
      persona.systemPrompt,
      contextPrompt,
      "=== SNAPSHOT FINANCEIRO ATUAL ===",
      financialContext,
      categoriesHint,
      `=== HOJE ===\n${today}`,
    ].join("\n\n");

    // ─── 5. Mensagem do usuário ────────────────────────
    const userContent = buildUserContent(body);

    // ─── 6. Tools filtradas por plano ──────────────────
    const useTools = persona.key !== "alert" && persona.key !== "summary";
    const tools = useTools ? filterToolsByPlan(authCtx.plan) : undefined;

    // ─── 7. Chamada Anthropic ──────────────────────────
    const messages: AnthropicMessage[] = [
      { role: "user", content: userContent },
    ];

    const aiResult = await callAnthropic({
      model: effectiveModel,
      system: fullSystemPrompt,
      messages,
      maxTokens: persona.maxTokens,
      tools,
      anthropicKey,
    });

    const parsed = parseAnthropicResult(aiResult);
    let responseText = parsed.text;

    // ─── 8. Salva interação primeiro (pra linkar ações) ─
    const { data: interactionRow } = await supabase
      .from("kora_interactions")
      .insert({
        user_id: userId,
        channel: body.channel,
        input_type: body.input_type,
        persona: persona.key,
        user_message: body.message ?? null,
        kora_response: responseText || null,
        model_used: effectiveModel,
        input_tokens: aiResult.inputTokens,
        output_tokens: aiResult.outputTokens,
        cost_usd: aiResult.costUsd,
        metadata: limitDecision.degraded
          ? { degraded: true, reason: limitDecision.warnings }
          : {},
      })
      .select("id")
      .single();

    const interactionId =
      interactionRow && typeof interactionRow.id === "string" ? interactionRow.id : null;

    // ─── 9. Executa tools ──────────────────────────────
    const pendingActions: PendingActionOut[] = [];
    const executedActions: ExecutedActionOut[] = [];
    const actionIds: string[] = [];

    for (const tool of parsed.toolUses) {
      const execResult = await executeTool(
        supabase,
        userId,
        tool.name,
        tool.input,
        interactionId,
        `Chamada via ${body.channel} persona=${persona.key}`,
      );
      if (execResult.action_id) actionIds.push(execResult.action_id);

      if (execResult.pending_confirmation && execResult.action_id) {
        pendingActions.push({
          action_id: execResult.action_id,
          description: describeAction(tool.name, tool.input),
          tool: tool.name,
          input: tool.input,
        });
      } else if (execResult.success && execResult.result) {
        executedActions.push({ tool: tool.name, result: execResult.result });
      }
    }

    if (actionIds.length > 0 && interactionId) {
      await supabase
        .from("kora_interactions")
        .update({ triggered_action_ids: actionIds })
        .eq("id", interactionId);
    }

    // ─── 10. Incrementa cota Opus se foi mesmo usado ───
    if (effectiveModel === "opus-4-7") {
      await incrementOpusUsage(supabase, userId);
    }

    // ─── 11. Extração de memória (só Pro/Business) ─────
    if (
      authCtx.plan !== "free" &&
      body.message &&
      responseText &&
      body.channel !== "system"
    ) {
      // Fire-and-forget; usa EdgeRuntime.waitUntil quando disponível pra não
      // ser abortado quando a response é devolvida.
      const extractionPromise = extractAndSaveMemories(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any,
        userId,
        body.message,
        responseText,
        anthropicKey,
      ).catch((e: unknown) => {
        console.error("[kora-brain] memory extraction failed:", e);
      });
      const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
      if (runtime?.waitUntil) {
        runtime.waitUntil(extractionPromise);
      }
    }

    // ─── 12. Formata resposta final ────────────────────
    if (!responseText && pendingActions.length > 0) {
      responseText = buildConfirmationText(pendingActions);
    }
    if (!responseText && executedActions.length > 0) {
      responseText = "Feito.";
    }
    if (limitDecision.userMessage && limitDecision.degraded && !limitDecision.blocked) {
      // Prepend gentle note when model was downgraded with user-facing message
      responseText = `${limitDecision.userMessage}\n\n${responseText}`.trim();
    }

    const response: BrainResponse = {
      success: true,
      response_text: responseText || "Ok.",
      persona_used: persona.key,
      model_used: effectiveModel,
      pending_actions: pendingActions,
      executed_actions: executedActions,
      cost_usd: aiResult.costUsd,
      interaction_id: interactionId,
      warnings: limitDecision.warnings.length > 0 ? limitDecision.warnings : undefined,
    };
    return jsonResponse(response, 200);
  } catch (err) {
    console.error("[kora-brain] error:", err);
    return jsonResponse(
      {
        success: false,
        response_text: "",
        persona_used: "default" as PersonaKey,
        model_used: null,
        pending_actions: [],
        executed_actions: [],
        cost_usd: 0,
        error: err instanceof Error ? err.message : "internal error",
      } satisfies BrainResponse,
      500,
    );
  }
});

// ==========================================================
// HELPERS
// ==========================================================

function buildUserContent(body: BrainRequest): string | AnthropicContentBlock[] {
  if (body.input_type === "trigger") {
    return `[Trigger automático] ${JSON.stringify(body.trigger_context ?? {})}`;
  }
  if (body.input_type === "image" && body.image_base64) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: body.image_media_type ?? "image/jpeg",
          data: body.image_base64,
        },
      },
      {
        type: "text",
        text:
          body.message ??
          "Analise essa imagem. Se for documento financeiro, identifique as transações e proponha registro.",
      },
    ];
  }
  return body.message ?? "";
}

interface FinancialSnapshot {
  month_expense: number;
  month_income: number;
  recent_balance: number;
  top_categories: Array<[string, number]>;
  total_debt: number;
  active_debts: Array<{ name: string; remaining_amount: number | string }>;
  active_goals: Array<{ name: string; target_amount: number | string; current_amount: number | string }>;
  budgets: Array<{ category: string; limit_amount: number | string; month_year: string }>;
  profile_type: "personal" | "business" | "both";
}

async function loadFinancialSnapshot(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<FinancialSnapshot> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthYear = monthStart.slice(0, 7);

  const [txRes, debtRes, goalRes, budgetRes, configRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, category")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .is("deleted_at", null),
    supabase
      .from("debts")
      .select("name, remaining_amount")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("goals")
      .select("name, target_amount, current_amount")
      .eq("user_id", userId)
      .is("deleted_at", null),
    supabase
      .from("budgets")
      .select("category, limit_amount, month_year")
      .eq("user_id", userId)
      .eq("month_year", monthYear),
    supabase
      .from("user_config")
      .select("profile_type")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const txs = (txRes.data ?? []) as Array<{ amount: number; type: string; category: string }>;
  const totalExpense = txs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = txs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);

  const catMap = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
  }
  const topCategories: Array<[string, number]> = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const debts = (debtRes.data ?? []) as Array<{ name: string; remaining_amount: number | string }>;
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0);

  const profileTypeRaw = (configRes.data as { profile_type?: string } | null)?.profile_type;
  const profileType: FinancialSnapshot["profile_type"] =
    profileTypeRaw === "business" || profileTypeRaw === "both" ? profileTypeRaw : "personal";

  return {
    month_expense: totalExpense,
    month_income: totalIncome,
    recent_balance: totalIncome - totalExpense,
    top_categories: topCategories,
    total_debt: totalDebt,
    active_debts: debts,
    active_goals: (goalRes.data ?? []) as FinancialSnapshot["active_goals"],
    budgets: (budgetRes.data ?? []) as FinancialSnapshot["budgets"],
    profile_type: profileType,
  };
}

function formatFinancialContext(snap: FinancialSnapshot): string {
  const brl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const parts: string[] = [];
  parts.push(
    `Mês atual: gastou ${brl(snap.month_expense)}, recebeu ${brl(snap.month_income)}, saldo ${brl(snap.recent_balance)}.`,
  );
  if (snap.top_categories.length > 0) {
    parts.push(
      `Top categorias: ${snap.top_categories.map(([c, v]) => `${c} (${brl(v)})`).join(", ")}.`,
    );
  }
  if (snap.total_debt > 0) {
    parts.push(`Dívidas ativas: ${brl(snap.total_debt)} no total.`);
  }
  if (snap.active_goals.length > 0) {
    parts.push(
      `Metas ativas: ${snap.active_goals
        .map((g) => `${g.name} (${brl(Number(g.current_amount))}/${brl(Number(g.target_amount))})`)
        .join(", ")}.`,
    );
  }
  if (snap.budgets.length > 0) {
    parts.push(
      `Orçamentos do mês: ${snap.budgets
        .map((b) => `${b.category} = ${brl(Number(b.limit_amount))}`)
        .join(", ")}.`,
    );
  }
  return parts.join(" ");
}

async function extractAndSaveMemories(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userMessage: string,
  koraResponse: string,
  anthropicKey: string,
): Promise<void> {
  const memories = await extractMemoriesFromInteraction(userMessage, koraResponse, anthropicKey);
  for (const m of memories) {
    await addMemory(supabase, userId, {
      type: m.type,
      content: m.content,
      importance: m.importance,
    });
  }
}

function buildConfirmationText(pending: Array<{ description: string }>): string {
  if (pending.length === 1) {
    const d = pending[0].description;
    return `Quer que eu ${d.charAt(0).toLowerCase()}${d.slice(1)}?`;
  }
  return (
    `Proponho ${pending.length} ações: ` +
    pending.map((p, i) => `(${i + 1}) ${p.description}`).join(", ") +
    `. Confirma?`
  );
}

function jsonResponse(body: BrainResponse | { success: false; error: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

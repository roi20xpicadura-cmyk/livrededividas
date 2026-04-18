// supabase/functions/_shared/kora-limits.ts
//
// Rate limits + circuit breaker pra Kora v2.
//
// Regras (espelham decisão do produto):
//   Plano Free:
//     - Zero Opus. Se persona escolheu opus → rebaixa pra haiku-4-5.
//       Usuário recebe mensagem: "análise profunda é feature Pro/Business"
//     - Zero Sonnet também (decisão #1): todas as personas coach/couple/emergency
//       caem pra haiku no Free.
//     - Vision: 5 fotos/mês (checkVisionLimit).
//
//   Plano Pro:     3 Opus/dia, 20 Opus/mês.
//   Plano Business: 10 Opus/dia, 100 Opus/mês.
//
// Circuit breaker do sistema (via kora_system_cost_today):
//   - > $50/dia → degrada Opus → Sonnet (menos qualidade, 20% do custo)
//   - > $100/dia → warn no log (alerta pro operador)
//   - > $150/dia → hard stop. Exceto persona emergency: passa com Sonnet
//                  (crise do usuário não pode ficar muda).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { ModelKey, PersonaKey } from "./kora-personas.ts";
import type { PlanKey } from "./kora-auth.ts";

const OPUS_LIMITS: Record<PlanKey, { daily: number; monthly: number }> = {
  free: { daily: 0, monthly: 0 },
  pro: { daily: 3, monthly: 20 },
  business: { daily: 10, monthly: 100 },
};

const VISION_MONTHLY_LIMITS: Record<PlanKey, number> = {
  free: 5,
  pro: Number.POSITIVE_INFINITY,
  business: Number.POSITIVE_INFINITY,
};

const SYSTEM_COST_DEGRADE = 50;
const SYSTEM_COST_WARN = 100;
const SYSTEM_COST_HARD_STOP = 150;

export interface RateLimitInput {
  userId: string;
  plan: PlanKey;
  persona: PersonaKey;
  desiredModel: ModelKey;
  supabase: SupabaseClient;
}

export interface RateLimitDecision {
  effectiveModel: ModelKey;
  /** true se o modelo foi rebaixado por qualquer motivo */
  degraded: boolean;
  /** true se a chamada deve ser bloqueada por completo */
  blocked: boolean;
  /** Mensagem amigável pra exibir ao usuário quando degrade/block */
  userMessage?: string;
  /** Warnings internos (pra log, não pro user) */
  warnings: string[];
}

/**
 * Decide qual modelo efetivamente usar antes de chamar Anthropic.
 * Lê kora_usage_limits e kora_system_cost_today.
 * NÃO incrementa nada — caller deve chamar incrementOpusUsage/VisionUsage
 * só depois da call bem-sucedida.
 */
export async function checkRateLimits(
  input: RateLimitInput,
): Promise<RateLimitDecision> {
  const { userId, plan, persona, desiredModel, supabase } = input;
  const warnings: string[] = [];

  // -----------------------------------------------
  // 1) Gate por plano (Free = só Haiku)
  // -----------------------------------------------
  if (plan === "free" && desiredModel !== "haiku-4-5") {
    // Coach, emergency, couple caem aqui. Free NUNCA usa sonnet/opus.
    return {
      effectiveModel: "haiku-4-5",
      degraded: true,
      blocked: false,
      userMessage:
        "Essa análise profunda é um recurso dos planos Pro e Business. Posso te ajudar de forma mais simples por aqui ou você quer saber mais sobre os planos?",
      warnings: ["plan_free_downgrade_to_haiku"],
    };
  }

  // -----------------------------------------------
  // 2) Se não é Opus, só checa circuit breaker abaixo (Sonnet/Haiku passam)
  // -----------------------------------------------
  if (desiredModel !== "opus-4-7") {
    const sysCheck = await checkSystemCost(supabase, persona, desiredModel);
    return { ...sysCheck, warnings: [...warnings, ...sysCheck.warnings] };
  }

  // -----------------------------------------------
  // 3) Opus: checa cota do usuário (Pro/Business)
  // -----------------------------------------------
  const limits = OPUS_LIMITS[plan];
  const usage = await getOrCreateUsage(supabase, userId);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const dailyUsed = usage.opus_daily_date === today ? usage.opus_daily_count : 0;
  const monthlyUsed = usage.opus_monthly_period === currentMonth ? usage.opus_monthly_count : 0;

  if (dailyUsed >= limits.daily) {
    return {
      effectiveModel: "sonnet-4-6",
      degraded: true,
      blocked: false,
      userMessage:
        `Atingi o limite de análises profundas por hoje (${limits.daily}/dia). Posso continuar com uma versão um pouco mais leve, ou se preferir, amanhã restauro o acesso completo.`,
      warnings: ["opus_daily_limit_reached"],
    };
  }
  if (monthlyUsed >= limits.monthly) {
    return {
      effectiveModel: "sonnet-4-6",
      degraded: true,
      blocked: false,
      userMessage:
        `Atingi o limite de análises profundas deste mês (${limits.monthly}/mês). Vou seguir com uma versão mais leve até o mês virar.`,
      warnings: ["opus_monthly_limit_reached"],
    };
  }

  // -----------------------------------------------
  // 4) Circuit breaker sistêmico (vale pra Opus também)
  // -----------------------------------------------
  const sysCheck = await checkSystemCost(supabase, persona, desiredModel);
  return { ...sysCheck, warnings: [...warnings, ...sysCheck.warnings] };
}

async function checkSystemCost(
  supabase: SupabaseClient,
  persona: PersonaKey,
  desiredModel: ModelKey,
): Promise<RateLimitDecision> {
  const warnings: string[] = [];
  const { data, error } = await supabase.rpc("kora_system_cost_today");

  if (error) {
    // Se não conseguir ler o custo, NÃO bloqueia — fail open (prefere responder
    // o usuário a ficar mudo por erro de observability).
    console.error("[kora-limits] kora_system_cost_today failed:", error);
    return {
      effectiveModel: desiredModel,
      degraded: false,
      blocked: false,
      warnings: ["cost_breaker_read_failed"],
    };
  }

  const cost = typeof data === "number" ? data : Number(data) || 0;

  if (cost >= SYSTEM_COST_WARN) {
    warnings.push(`system_cost_today_${cost.toFixed(2)}_above_warn_threshold`);
  }

  if (cost >= SYSTEM_COST_HARD_STOP) {
    if (persona === "emergency") {
      // Emergency passa mesmo assim, mas com Sonnet (paga-se o custo extra).
      return {
        effectiveModel: "sonnet-4-6",
        degraded: true,
        blocked: false,
        userMessage: undefined, // sem mensagem degradante em emergência
        warnings: [...warnings, "emergency_degraded_to_sonnet_cost_breaker"],
      };
    }
    return {
      effectiveModel: desiredModel,
      degraded: false,
      blocked: true,
      userMessage:
        "A Kora tá sobrecarregada agora e precisa descansar por algumas horas. Volta mais tarde — tá tudo bem com sua conta.",
      warnings: [...warnings, "system_cost_hard_stop"],
    };
  }

  if (cost >= SYSTEM_COST_DEGRADE && desiredModel === "opus-4-7") {
    return {
      effectiveModel: "sonnet-4-6",
      degraded: true,
      blocked: false,
      userMessage: undefined,
      warnings: [...warnings, "opus_degraded_to_sonnet_cost_breaker"],
    };
  }

  return { effectiveModel: desiredModel, degraded: false, blocked: false, warnings };
}

// ==========================================================
// Incremento de contadores (chamar SÓ depois da call bem-sucedida)
// ==========================================================

interface KoraUsageRow {
  user_id: string;
  opus_daily_count: number;
  opus_daily_date: string;
  opus_monthly_count: number;
  opus_monthly_period: string;
  vision_monthly_count: number;
  vision_monthly_period: string;
}

async function getOrCreateUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<KoraUsageRow> {
  const { data } = await supabase
    .from("kora_usage_limits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return data as unknown as KoraUsageRow;
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const fresh: KoraUsageRow = {
    user_id: userId,
    opus_daily_count: 0,
    opus_daily_date: today,
    opus_monthly_count: 0,
    opus_monthly_period: month,
    vision_monthly_count: 0,
    vision_monthly_period: month,
  };
  await supabase.from("kora_usage_limits").insert(fresh);
  return fresh;
}

/**
 * Incrementa contadores Opus. Reseta diário/mensal se a data/período rolou.
 */
export async function incrementOpusUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const row = await getOrCreateUsage(supabase, userId);

  const newDailyCount =
    row.opus_daily_date === today ? row.opus_daily_count + 1 : 1;
  const newMonthlyCount =
    row.opus_monthly_period === month ? row.opus_monthly_count + 1 : 1;

  await supabase
    .from("kora_usage_limits")
    .update({
      opus_daily_count: newDailyCount,
      opus_daily_date: today,
      opus_monthly_count: newMonthlyCount,
      opus_monthly_period: month,
    })
    .eq("user_id", userId);
}

/**
 * Checa se usuário ainda tem cotas de Vision pro mês atual.
 */
export async function checkVisionLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanKey,
): Promise<{ allowed: boolean; remaining: number; userMessage?: string }> {
  const cap = VISION_MONTHLY_LIMITS[plan];
  if (cap === Number.POSITIVE_INFINITY) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }

  const row = await getOrCreateUsage(supabase, userId);
  const month = new Date().toISOString().slice(0, 7);
  const used = row.vision_monthly_period === month ? row.vision_monthly_count : 0;
  const remaining = Math.max(0, cap - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      userMessage: `Você usou suas ${cap} análises de foto grátis desse mês. No Pro são ilimitadas.`,
    };
  }
  return { allowed: true, remaining };
}

export async function incrementVisionUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  const row = await getOrCreateUsage(supabase, userId);
  const newCount = row.vision_monthly_period === month ? row.vision_monthly_count + 1 : 1;

  await supabase
    .from("kora_usage_limits")
    .update({
      vision_monthly_count: newCount,
      vision_monthly_period: month,
    })
    .eq("user_id", userId);
}

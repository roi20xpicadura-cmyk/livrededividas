// supabase/functions/_shared/kora-memory.ts
//
// Camada de memória longa da Kora.
// - getUserContext: lê contexto consolidado via RPC get_kora_context
// - addMemory: grava fato novo com dedup semântico simples
// - updateProfileTraits: smooth update dos traços psicográficos
// - buildContextPrompt: serializa o contexto em texto pro system prompt
// - extractMemoriesFromInteraction: pede pro Haiku extrair fatos da conversa
//
// TTL automático (180d/365d/nunca conforme memory_type) é feito no Postgres
// pelo trigger kora_memory_set_expires. Caller pode override passando expires_at.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAnthropic } from "./kora-llm.ts";

export type MemoryType =
  | "fact"
  | "preference"
  | "pattern"
  | "event"
  | "goal_context"
  | "conversation";

export interface KoraMemory {
  type: MemoryType;
  content: string;
  importance: number;
}

export interface KoraProfileShape {
  trait_planner: number;
  trait_frugal: number;
  trait_risk_tolerant: number;
  trait_emotional_spender: number;
  trait_social_oriented: number;
  prefers_direct_tone: boolean;
  prefers_data_heavy: boolean;
  prefers_emotional_support: boolean;
  life_context: Record<string, unknown>;
  spending_patterns: Record<string, unknown>;
  profile_confidence: number;
  interactions_analyzed?: number;
}

export interface KoraActivePlan {
  id: string;
  type: string;
  title: string;
  progress: number | null;
  next_checkin: string | null;
}

export interface KoraRecentInteraction {
  date: string;
  user_message: string | null;
  kora_response: string | null;
}

export interface KoraUserContext {
  memories: KoraMemory[];
  profile: Partial<KoraProfileShape> | null;
  activePlans: KoraActivePlan[];
  recentInteractions: KoraRecentInteraction[];
}

// ==========================================================
// Carrega contexto consolidado via RPC (performático — 1 round-trip)
// ==========================================================
export async function getUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<KoraUserContext> {
  const { data, error } = await supabase.rpc("get_kora_context", {
    p_user_id: userId,
  });

  if (error || !data || typeof data !== "object") {
    console.error("[kora-memory] get_kora_context failed:", error);
    return { memories: [], profile: null, activePlans: [], recentInteractions: [] };
  }

  const d = data as {
    memories?: unknown;
    profile?: unknown;
    active_plans?: unknown;
    recent_interactions?: unknown;
  };

  return {
    memories: Array.isArray(d.memories) ? (d.memories as KoraMemory[]) : [],
    profile: isRecord(d.profile) && Object.keys(d.profile).length > 0
      ? (d.profile as Partial<KoraProfileShape>)
      : null,
    activePlans: Array.isArray(d.active_plans) ? (d.active_plans as KoraActivePlan[]) : [],
    recentInteractions: Array.isArray(d.recent_interactions)
      ? (d.recent_interactions as KoraRecentInteraction[])
      : [],
  };
}

// ==========================================================
// Adiciona memória com dedup semântico simples
// ==========================================================
export interface AddMemoryParams {
  type: MemoryType;
  content: string;
  importance?: number;
  confidence?: number;
  /** Override opcional do TTL definido pelo trigger. */
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

export async function addMemory(
  supabase: SupabaseClient,
  userId: string,
  params: AddMemoryParams,
): Promise<string | null> {
  // 1) Tenta achar memória muito similar já existente
  const { data: existing } = await supabase
    .from("kora_memory")
    .select("id, content, importance, reference_count")
    .eq("user_id", userId)
    .eq("memory_type", params.type)
    .ilike("content", `%${params.content.slice(0, 50)}%`)
    .limit(3);

  const similar = Array.isArray(existing)
    ? existing.find((m) => isSemanticSimilar(m.content as string, params.content))
    : null;

  if (similar && typeof similar.id === "string") {
    // Incrementa referência e empurra importance levemente pra cima
    const newImportance = Math.min(1, (Number(similar.importance) || 0.5) + 0.05);
    const newRefCount = (Number(similar.reference_count) || 0) + 1;
    await supabase
      .from("kora_memory")
      .update({
        reference_count: newRefCount,
        importance: newImportance,
        last_referenced_at: new Date().toISOString(),
      })
      .eq("id", similar.id);
    return similar.id;
  }

  // 2) Insert novo. expires_at fica NULL → trigger kora_memory_set_expires
  //    calcula baseado no memory_type. Caller pode override passando expiresAt.
  const insertRow: Record<string, unknown> = {
    user_id: userId,
    memory_type: params.type,
    content: params.content,
    confidence: params.confidence ?? 0.8,
    importance: params.importance ?? 0.5,
    metadata: params.metadata ?? {},
  };
  if (params.expiresAt !== undefined) {
    insertRow.expires_at = params.expiresAt;
  }

  const { data, error } = await supabase
    .from("kora_memory")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[kora-memory] addMemory failed:", error);
    return null;
  }
  return typeof data.id === "string" ? data.id : null;
}

// ==========================================================
// Smooth update dos traços psicográficos
// Só roda via service_role (RLS impede user de editar o próprio perfil)
// ==========================================================
export async function updateProfileTraits(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<KoraProfileShape>,
): Promise<void> {
  const { data: current } = await supabase
    .from("kora_user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!current) {
    await supabase.from("kora_user_profile").insert({
      user_id: userId,
      ...updates,
      last_updated_at: new Date().toISOString(),
    });
    return;
  }

  // Mistura 80% antigo + 20% novo pra evitar oscilação em cada interação.
  const smoothed: Record<string, unknown> = {};
  for (const [key, newValue] of Object.entries(updates)) {
    const oldValue = (current as Record<string, unknown>)[key];
    if (typeof newValue === "number" && typeof oldValue === "number") {
      smoothed[key] = oldValue * 0.8 + newValue * 0.2;
    } else if (newValue !== undefined) {
      smoothed[key] = newValue;
    }
  }

  const prevAnalyzed = Number((current as Record<string, unknown>).interactions_analyzed ?? 0);
  const prevConfidence = Number((current as Record<string, unknown>).profile_confidence ?? 0.1);
  smoothed.interactions_analyzed = prevAnalyzed + 1;
  smoothed.profile_confidence = Math.min(1, prevConfidence + 0.02);
  smoothed.last_updated_at = new Date().toISOString();

  await supabase.from("kora_user_profile").update(smoothed).eq("user_id", userId);
}

// ==========================================================
// Serializa o contexto em texto pra incluir no system prompt
// ==========================================================
export function buildContextPrompt(ctx: KoraUserContext): string {
  const sections: string[] = [];

  if (ctx.memories.length > 0) {
    sections.push("=== O QUE VOCÊ SABE SOBRE O USUÁRIO ===\n");
    const grouped = groupBy(ctx.memories, "type");

    if (grouped.fact?.length) {
      sections.push("Fatos:\n" + grouped.fact.map((m) => `- ${m.content}`).join("\n"));
    }
    if (grouped.preference?.length) {
      sections.push("\nPreferências:\n" + grouped.preference.map((m) => `- ${m.content}`).join("\n"));
    }
    if (grouped.pattern?.length) {
      sections.push("\nPadrões comportamentais:\n" + grouped.pattern.map((m) => `- ${m.content}`).join("\n"));
    }
    if (grouped.event?.length) {
      sections.push("\nEventos relevantes:\n" + grouped.event.map((m) => `- ${m.content}`).join("\n"));
    }
    if (grouped.goal_context?.length) {
      sections.push("\nContexto de metas:\n" + grouped.goal_context.map((m) => `- ${m.content}`).join("\n"));
    }
  }

  if (ctx.profile && typeof ctx.profile.profile_confidence === "number" && ctx.profile.profile_confidence > 0.3) {
    sections.push("\n=== PERFIL DO USUÁRIO ===");
    sections.push(describeProfile(ctx.profile as KoraProfileShape));
  }

  if (ctx.activePlans.length > 0) {
    sections.push("\n=== PLANOS DE COACHING ATIVOS ===");
    for (const p of ctx.activePlans) {
      sections.push(`- ${p.title} (${p.type}) — ${p.progress ?? 0}% concluído`);
    }
  }

  if (ctx.recentInteractions.length > 0) {
    sections.push("\n=== ÚLTIMAS 5 CONVERSAS ===");
    for (const i of ctx.recentInteractions) {
      if (i.user_message) sections.push(`Usuário: ${truncate(i.user_message, 120)}`);
      if (i.kora_response) sections.push(`Você: ${truncate(i.kora_response, 120)}`);
    }
  }

  if (sections.length === 0) {
    return "=== SEM CONTEXTO PRÉVIO ===\nUsuário novo ou com histórico mínimo. Seja acolhedora sem questionário — deixe fluir.";
  }
  return sections.join("\n");
}

function describeProfile(p: KoraProfileShape): string {
  const parts: string[] = [];

  if (p.trait_planner > 0.7) parts.push("É muito planejador — gosta de orçamentos e metas claras.");
  else if (p.trait_planner < 0.3) parts.push("É mais impulsivo — resiste a orçamentos rígidos. Prefere flexibilidade.");

  if (p.trait_frugal > 0.7) parts.push("É econômico — prioriza poupar, desconfortável gastando muito.");
  else if (p.trait_frugal < 0.3) parts.push("Valoriza experiências — tá confortável gastando no que importa pra ele.");

  if (p.trait_risk_tolerant > 0.7) parts.push("Aceita risco — tolera volatilidade, topa investir.");
  else if (p.trait_risk_tolerant < 0.3) parts.push("Aversão a risco — prefere segurança e previsibilidade.");

  if (p.trait_emotional_spender > 0.6) parts.push("Tem gastos emocionais frequentes — atenção a padrões de estresse/celebração.");

  if (p.prefers_emotional_support) parts.push("Responde melhor a suporte emocional do que a dados puros.");
  if (p.prefers_data_heavy) parts.push("Gosta de números, gráficos e detalhes.");
  if (!p.prefers_direct_tone) parts.push("Prefere tom mais suave — evite ser muito direta.");

  const ctx = p.life_context ?? {};
  if (ctx.has_children) parts.push(`Tem filhos (${ctx.children_count ?? "não sabe quantos"}).`);
  if (ctx.relationship_status === "married") parts.push("Casado(a).");
  if (ctx.is_mei) parts.push("É MEI.");
  if (ctx.has_side_business) parts.push("Tem renda extra/negócio paralelo.");

  const patterns = p.spending_patterns ?? {};
  if (Array.isArray(patterns.peak_days) && patterns.peak_days.length > 0) {
    parts.push(`Gasta mais nos dias: ${(patterns.peak_days as string[]).join(", ")}.`);
  }
  if (Array.isArray(patterns.stress_categories) && patterns.stress_categories.length > 0) {
    parts.push(`Categorias de gasto emocional: ${(patterns.stress_categories as string[]).join(", ")}.`);
  }

  return parts.length > 0 ? parts.join(" ") : "Perfil ainda em construção. Observe e aprenda.";
}

// ==========================================================
// Extrai memórias novas de uma conversa via Haiku (barato)
// ==========================================================
export async function extractMemoriesFromInteraction(
  userMessage: string,
  koraResponse: string,
  anthropicKey: string,
): Promise<Array<{ type: MemoryType; content: string; importance: number }>> {
  if (!anthropicKey || !userMessage.trim()) return [];

  const prompt = `Analise a conversa abaixo entre o usuário e a IA Kora (app financeiro brasileiro). Extraia APENAS fatos, preferências ou padrões NOVOS e relevantes que vale a pena lembrar em conversas futuras.

USUÁRIO: ${userMessage}
KORA: ${koraResponse}

Retorne um JSON array (pode ser vazio) com objetos:
{
  "type": "fact" | "preference" | "pattern" | "event" | "goal_context",
  "content": "frase curta em 3a pessoa descrevendo a memória",
  "importance": 0.1 a 1.0
}

REGRAS:
- NÃO extraia nada genérico tipo "quer economizar"
- Só extraia se for ESPECÍFICO e ACIONÁVEL
- Fatos: dados concretos ("tem dívida de R$ 12k no Nubank", "mora em SP")
- Preferências: estilo ("prefere orçamento flexível")
- Padrões: comportamento recorrente ("gasta mais às sextas")
- Eventos: marcos ("casou em março")
- Goal_context: contexto de meta ("quer R$ 20k pra lua de mel em outubro")
- Se a conversa não revelou nada novo, retorne []

Responda APENAS o JSON, sem markdown.`;

  try {
    const result = await callAnthropic({
      model: "haiku-4-5",
      system: "Você extrai memórias financeiras estruturadas em JSON. Responda apenas JSON válido.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 500,
      anthropicKey,
    });

    const textBlock = result.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "[]";
    const clean = text.replace(/^```(json)?|```$/gm, "").trim();
    const parsed: unknown = JSON.parse(clean);

    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isExtractedMemory)
      .slice(0, 5);
  } catch (err) {
    console.error("[kora-memory] extractMemoriesFromInteraction failed:", err);
    return [];
  }
}

function isExtractedMemory(
  v: unknown,
): v is { type: MemoryType; content: string; importance: number } {
  if (!isRecord(v)) return false;
  const typeOk = typeof v.type === "string" &&
    ["fact", "preference", "pattern", "event", "goal_context"].includes(v.type);
  const contentOk = typeof v.content === "string" && v.content.length > 0;
  const impOk = typeof v.importance === "number" && v.importance >= 0 && v.importance <= 1;
  return typeOk && contentOk && impOk;
}

// ==========================================================
// Helpers
// ==========================================================
export function isSemanticSimilar(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.length > 0 && nb.length > 0 && (na.includes(nb) || nb.includes(na))) return true;
  // Jaccard simples em tokens
  const sa = new Set(na.split(" ").filter(Boolean));
  const sb = new Set(nb.split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return false;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union > 0 && inter / union > 0.7;
}

function groupBy<T extends { type: MemoryType }>(arr: T[], key: "type"): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(item[key]);
    (out[k] ??= []).push(item);
  }
  return out;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

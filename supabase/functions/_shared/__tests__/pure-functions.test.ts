// supabase/functions/_shared/__tests__/pure-functions.test.ts
//
// Testes unitários das funções puras dos shared modules.
// Escopo limitado por decisão: só regras de negócio críticas (quem paga quanto,
// qual modelo usar, se duplicou memória, quais tools aparecem no plano X).
// Mocks de LLM/Supabase ficam pra E2E depois.
//
// Rodar: `deno test supabase/functions/_shared/__tests__/pure-functions.test.ts`

import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  selectPersona,
  estimateCostUSD,
  PERSONAS,
} from "../kora-personas.ts";
import { filterToolsByPlan, KORA_TOOLS } from "../kora-tools.ts";
import { isSemanticSimilar } from "../kora-memory.ts";

// ==========================================================
// selectPersona — escolhe a persona certa por sinais
// ==========================================================
Deno.test("selectPersona: default quando não há sinais", () => {
  const p = selectPersona({ userMessage: "quanto gastei esse mês?" });
  assertEquals(p.key, "default");
  assertEquals(p.model, "haiku-4-5");
});

Deno.test("selectPersona: explicitPersona tem prioridade absoluta", () => {
  const p = selectPersona({
    userMessage: "qualquer coisa",
    explicitPersona: "emergency",
  });
  assertEquals(p.key, "emergency");
});

Deno.test("selectPersona: triggerType alert vira persona alert", () => {
  const p = selectPersona({ triggerType: "alert" });
  assertEquals(p.key, "alert");
  assertEquals(p.model, "haiku-4-5");
});

Deno.test("selectPersona: triggerType summary vira persona summary com Sonnet", () => {
  const p = selectPersona({ triggerType: "summary" });
  assertEquals(p.key, "summary");
  assertEquals(p.model, "sonnet-4-6");
});

Deno.test("selectPersona: sinal emergencial detectado", () => {
  const p = selectPersona({
    userMessage: "não aguento mais, perdi o emprego e tô desesperado",
  });
  assertEquals(p.key, "emergency");
});

Deno.test("selectPersona: dívida alta + estresse vira emergency", () => {
  const p = selectPersona({
    userMessage: "tá apertado, tô preocupado",
    userContext: { total_debt: 25000 },
  });
  assertEquals(p.key, "emergency");
});

Deno.test("selectPersona: dívida alta sem sinal de estresse vira coach (pergunta estratégica)", () => {
  const p = selectPersona({
    userMessage: "como devo organizar pra quitar essa dívida?",
    userContext: { total_debt: 25000 },
  });
  assertEquals(p.key, "coach");
});

Deno.test("selectPersona: menção a parceiro com casal ativo", () => {
  const p = selectPersona({
    userMessage: "eu e meu marido estamos conversando sobre economia",
    userContext: { has_couple_mode: true },
  });
  assertEquals(p.key, "couple");
});

Deno.test("selectPersona: menção a negócio com business context", () => {
  const p = selectPersona({
    userMessage: "quanto tive de faturamento esse mês na empresa?",
    userContext: { has_business_context: true },
  });
  assertEquals(p.key, "business");
});

Deno.test("selectPersona: pergunta estratégica vira coach", () => {
  const p = selectPersona({
    userMessage: "qual a melhor forma de investir pra aposentadoria?",
  });
  assertEquals(p.key, "coach");
  assertEquals(p.model, "opus-4-7");
});

Deno.test("selectPersona: todas as PERSONAS têm config completo", () => {
  for (const key of ["default","coach","alert","summary","couple","business","emergency"] as const) {
    const cfg = PERSONAS[key];
    assertStrictEquals(cfg.key, key);
    assertEquals(typeof cfg.maxTokens, "number");
    assertEquals(cfg.systemPrompt.length > 100, true);
  }
});

// ==========================================================
// filterToolsByPlan — gate de tools por plano
// ==========================================================
Deno.test("filterToolsByPlan: free NÃO tem create_coaching_plan nem add_memory", () => {
  const tools = filterToolsByPlan("free");
  const names = tools.map((t) => t.name);
  assertEquals(names.includes("create_coaching_plan"), false);
  assertEquals(names.includes("add_memory"), false);
  // Mas tem as tools de transação/budget/goal
  assertEquals(names.includes("create_transaction"), true);
  assertEquals(names.includes("create_budget"), true);
  assertEquals(names.includes("create_goal"), true);
});

Deno.test("filterToolsByPlan: pro tem coaching_plan e add_memory", () => {
  const tools = filterToolsByPlan("pro");
  const names = tools.map((t) => t.name);
  assertEquals(names.includes("create_coaching_plan"), true);
  assertEquals(names.includes("add_memory"), true);
});

Deno.test("filterToolsByPlan: business tem todas as tools", () => {
  const tools = filterToolsByPlan("business");
  assertEquals(tools.length, KORA_TOOLS.length);
});

Deno.test("filterToolsByPlan: nenhuma plano retorna array vazio", () => {
  assertEquals(filterToolsByPlan("free").length > 0, true);
  assertEquals(filterToolsByPlan("pro").length > 0, true);
  assertEquals(filterToolsByPlan("business").length > 0, true);
});

// ==========================================================
// estimateCostUSD — cálculo de custo por modelo
// ==========================================================
Deno.test("estimateCostUSD: Haiku 4.5 = $1/M input + $5/M output", () => {
  const cost = estimateCostUSD("haiku-4-5", 1_000_000, 1_000_000);
  assertEquals(cost, 6.0); // $1 + $5
});

Deno.test("estimateCostUSD: Sonnet 4.6 = $3/M input + $15/M output", () => {
  const cost = estimateCostUSD("sonnet-4-6", 1_000_000, 1_000_000);
  assertEquals(cost, 18.0); // $3 + $15
});

Deno.test("estimateCostUSD: Opus 4.7 = $5/M input + $25/M output (preço novo validado)", () => {
  const cost = estimateCostUSD("opus-4-7", 1_000_000, 1_000_000);
  assertEquals(cost, 30.0); // $5 + $25
});

Deno.test("estimateCostUSD: zero tokens = zero custo", () => {
  assertEquals(estimateCostUSD("haiku-4-5", 0, 0), 0);
  assertEquals(estimateCostUSD("opus-4-7", 0, 0), 0);
});

Deno.test("estimateCostUSD: chamada típica de 1k in + 500 out em Haiku", () => {
  const cost = estimateCostUSD("haiku-4-5", 1000, 500);
  // (1000 * 1 + 500 * 5) / 1_000_000 = (1000 + 2500) / 1_000_000 = 0.0035
  assertEquals(cost, 0.0035);
});

// ==========================================================
// isSemanticSimilar — dedup de memória
// ==========================================================
Deno.test("isSemanticSimilar: strings idênticas após normalização", () => {
  assertEquals(isSemanticSimilar("Mora em SP", "mora em sp"), true);
  assertEquals(isSemanticSimilar("Açaí", "acai"), true);
});

Deno.test("isSemanticSimilar: um contém o outro", () => {
  assertEquals(
    isSemanticSimilar("Tem dívida no Nubank", "Tem dívida no Nubank de R$ 5k"),
    true,
  );
});

Deno.test("isSemanticSimilar: strings totalmente diferentes não matcham", () => {
  assertEquals(
    isSemanticSimilar("Mora em São Paulo", "Gosta de viajar"),
    false,
  );
});

Deno.test("isSemanticSimilar: Jaccard > 0.7 matcha", () => {
  // "gasta muito em delivery às sextas" vs "às sextas gasta muito em delivery"
  // Tokens iguais, ordem diferente → Jaccard = 1.0
  assertEquals(
    isSemanticSimilar(
      "gasta muito em delivery as sextas",
      "as sextas gasta muito em delivery",
    ),
    true,
  );
});

Deno.test("isSemanticSimilar: strings vazias não matcham", () => {
  assertEquals(isSemanticSimilar("", "algo"), false);
  assertEquals(isSemanticSimilar("algo", ""), false);
});

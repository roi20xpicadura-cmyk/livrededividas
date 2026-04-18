// Testes das funções puras do kora-tools.ts
// Rodar: deno test supabase/functions/_shared/__tests__/kora-tools.test.ts
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  shouldAutoExecute,
  filterToolsByPlan,
  describeAction,
  KORA_TOOLS,
} from "../kora-tools.ts";

// ── shouldAutoExecute ──────────────────────────────────
Deno.test("shouldAutoExecute: add_memory é auto", () => {
  assertEquals(shouldAutoExecute("add_memory"), true);
});
Deno.test("shouldAutoExecute: recategorize_transaction é auto", () => {
  assertEquals(shouldAutoExecute("recategorize_transaction"), true);
});
Deno.test("shouldAutoExecute: create_transaction NUNCA é auto (exige confirmação)", () => {
  assertEquals(shouldAutoExecute("create_transaction"), false);
});
Deno.test("shouldAutoExecute: ferramenta inexistente é false", () => {
  assertEquals(shouldAutoExecute("delete_universe"), false);
});

// ── filterToolsByPlan ──────────────────────────────────
Deno.test("filterToolsByPlan: free não vê create_coaching_plan nem add_memory", () => {
  const tools = filterToolsByPlan("free").map((t) => t.name);
  assert(!tools.includes("create_coaching_plan"), "free não pode ter coaching_plan");
  assert(!tools.includes("add_memory"), "free não pode ter add_memory");
});
Deno.test("filterToolsByPlan: pro tem todas as tools incluindo coaching_plan", () => {
  const tools = filterToolsByPlan("pro").map((t) => t.name);
  assert(tools.includes("create_coaching_plan"));
  assert(tools.includes("add_memory"));
  assert(tools.includes("create_transaction"));
});
Deno.test("filterToolsByPlan: business tem todas as tools", () => {
  const tools = filterToolsByPlan("business").map((t) => t.name);
  assertEquals(tools.length, KORA_TOOLS.length);
});

// ── describeAction ─────────────────────────────────────
Deno.test("describeAction: create_transaction formata em pt-BR", () => {
  const desc = describeAction("create_transaction", {
    type: "expense", amount: 42.5, category: "Alimentação", description: "Almoço",
  });
  assert(desc.includes("gasto"));
  assert(desc.includes("Alimentação"));
  // Aceita "R$" ou "R$\u00A0" (NBSP) — Intl pode usar qualquer um.
  assert(/R\$\s?42,50/.test(desc), `formato moeda inesperado: ${desc}`);
});
Deno.test("describeAction: income vira 'receita'", () => {
  const desc = describeAction("create_transaction", {
    type: "income", amount: 100, category: "Salário", description: "Pgto",
  });
  assert(desc.includes("receita"));
});
Deno.test("describeAction: tool desconhecida tem fallback", () => {
  assertEquals(describeAction("foo_bar", {}), "Ação: foo_bar");
});
Deno.test("describeAction: create_goal inclui deadline quando presente", () => {
  const d = describeAction("create_goal", {
    name: "Viagem", target_amount: 5000, deadline: "2026-12-01",
  });
  assert(d.includes("Viagem"));
  assert(d.includes("2026-12-01"));
});

// ── Schema integrity ───────────────────────────────────
Deno.test("KORA_TOOLS: toda tool tem name, description e input_schema", () => {
  for (const t of KORA_TOOLS) {
    assert(t.name && typeof t.name === "string", `tool sem name: ${JSON.stringify(t)}`);
    assert(t.description && t.description.length > 10, `${t.name}: description curta`);
    assertEquals(t.input_schema.type, "object");
  }
});
Deno.test("KORA_TOOLS: nomes únicos", () => {
  const names = KORA_TOOLS.map((t) => t.name);
  assertEquals(new Set(names).size, names.length, "tool name duplicado");
});

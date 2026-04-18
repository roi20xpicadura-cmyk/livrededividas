// supabase/functions/_shared/kora-tools.ts
//
// Tool Use da Kora — permite que a IA EXECUTE ações, não só fale.
// Ações de baixo risco (add_memory, recategorize) executam auto.
// Ações de impacto financeiro (transaction/budget/goal/debt/plan) exigem
// confirmação via kora-confirm-action endpoint (Fase 3).
//
// Diffs vs blueprint original:
//  - Schema das tools adaptado ao banco real:
//      transaction.date (não transaction_date), origin (não context),
//      budget.limit_amount + month_year, goal.deadline (não target_date)
//  - create_debt gera defaults pra creditor/debt_type (NOT NULL no schema)
//  - Categorias validadas contra listas reais do projeto via kora-categories
//  - filterToolsByPlan remove create_coaching_plan do Free
//  - schedule_reminder comentada (TODO — tabela reminders não existe ainda)

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { PlanKey } from "./kora-auth.ts";
import {
  getValidCategories,
  normalizeCategory,
  type TransactionOrigin,
  type TransactionType,
} from "./kora-categories.ts";

// ==========================================================
// Schema das tools (formato Anthropic tool_use)
// ==========================================================
export interface KoraTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const KORA_TOOLS: KoraTool[] = [
  {
    name: "create_transaction",
    description:
      "Registra uma nova transação (despesa ou receita). Use quando o usuário explicitamente informou um gasto ou recebimento que ainda não está registrado.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Valor em reais, sempre positivo" },
        type: { type: "string", enum: ["expense", "income"] },
        category: { type: "string", description: "Uma das categorias válidas do perfil do usuário" },
        description: { type: "string", description: "Descrição curta (ex: 'Almoço', 'Salário')" },
        date: {
          type: "string",
          description: "Data ISO YYYY-MM-DD. Se não informada, usa hoje.",
        },
        origin: {
          type: "string",
          enum: ["personal", "business"],
          description: "'personal' pra gasto pessoal, 'business' pra gasto do negócio",
        },
      },
      required: ["amount", "type", "category", "description"],
    },
  },
  {
    name: "recategorize_transaction",
    description: "Muda a categoria de uma transação existente.",
    input_schema: {
      type: "object",
      properties: {
        transaction_id: { type: "string" },
        new_category: { type: "string" },
      },
      required: ["transaction_id", "new_category"],
    },
  },
  {
    name: "create_budget",
    description:
      "Cria/atualiza orçamento mensal pra uma categoria. Usa o mês atual se month_year não for passado.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        limit_amount: { type: "number", description: "Valor do limite mensal em reais" },
        month_year: {
          type: "string",
          description: "YYYY-MM (default: mês atual)",
        },
      },
      required: ["category", "limit_amount"],
    },
  },
  {
    name: "update_budget",
    description: "Ajusta valor de orçamento existente.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        new_amount: { type: "number" },
        month_year: { type: "string", description: "YYYY-MM (default: mês atual)" },
      },
      required: ["category", "new_amount"],
    },
  },
  {
    name: "create_goal",
    description:
      "Cria uma meta financeira. Use quando usuário manifestar desejo concreto com valor e prazo (ou prazo inferível).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        target_amount: { type: "number", description: "Valor alvo em reais" },
        deadline: {
          type: "string",
          description: "Data alvo ISO YYYY-MM-DD",
        },
        initial_amount: { type: "number", description: "Valor inicial já economizado (default 0)" },
      },
      required: ["name", "target_amount"],
    },
  },
  {
    name: "create_debt",
    description:
      "Registra uma dívida nova. Use quando o usuário mencionar dívida ainda não cadastrada.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome amigável (ex: 'Cartão Nubank')" },
        total_amount: { type: "number" },
        creditor: {
          type: "string",
          description: "Credor (banco/empresa). Default: mesmo que name.",
        },
        debt_type: {
          type: "string",
          description: "Tipo (ex: 'cartao', 'emprestimo', 'financiamento', 'outros')",
        },
        interest_rate: { type: "number", description: "% ao mês (opcional)" },
        remaining_installments: { type: "number", description: "Parcelas restantes (opcional)" },
      },
      required: ["name", "total_amount"],
    },
  },
  {
    name: "create_coaching_plan",
    description:
      "Inicia um plano de coaching estruturado (quitação de dívida, poupança, saída do vermelho). Use após análise profunda e concordância do usuário. Bloqueado no plano Free.",
    input_schema: {
      type: "object",
      properties: {
        plan_type: {
          type: "string",
          enum: [
            "debt_payoff",
            "savings",
            "budget_recovery",
            "goal_achievement",
            "financial_education",
          ],
        },
        title: { type: "string" },
        description: { type: "string" },
        target_date: { type: "string", description: "ISO date opcional" },
        steps: {
          type: "array",
          description: "Array de passos do plano",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              target_value: { type: "number" },
              deadline: { type: "string" },
            },
          },
        },
        checkin_frequency: {
          type: "string",
          enum: ["daily", "weekly", "biweekly", "monthly"],
        },
      },
      required: ["plan_type", "title", "description", "steps"],
    },
  },
  {
    name: "add_memory",
    description:
      "Salva um fato, preferência ou padrão importante sobre o usuário pra lembrar em conversas futuras. Use proativamente.",
    input_schema: {
      type: "object",
      properties: {
        memory_type: {
          type: "string",
          enum: ["fact", "preference", "pattern", "event", "goal_context"],
        },
        content: { type: "string", description: "Frase curta em 3a pessoa" },
        importance: { type: "number", description: "0.1 (trivial) a 1.0 (crítico)" },
      },
      required: ["memory_type", "content"],
    },
  },
  // TODO: schedule_reminder — aguardando criação da tabela reminders +
  //       definição de UX de notificação (push? WhatsApp? email? retry logic?).
];

// ==========================================================
// Classificação de risco
// ==========================================================
const AUTO_EXECUTE_TOOLS = new Set<string>(["add_memory", "recategorize_transaction"]);

export function shouldAutoExecute(toolName: string): boolean {
  return AUTO_EXECUTE_TOOLS.has(toolName);
}

// ==========================================================
// Filtro de tools por plano
// ==========================================================
const PRO_ONLY_TOOLS = new Set<string>(["create_coaching_plan"]);
const FREE_DISALLOWED = new Set<string>(["create_coaching_plan", "add_memory"]);

/**
 * Retorna a lista de tools disponíveis pro plano.
 *  - Free: sem coaching_plan, sem add_memory (decisão "Free sem memória longa")
 *  - Pro/Business: todas
 */
export function filterToolsByPlan(plan: PlanKey): KoraTool[] {
  if (plan === "free") {
    return KORA_TOOLS.filter((t) => !FREE_DISALLOWED.has(t.name));
  }
  return KORA_TOOLS.filter((t) => {
    if (PRO_ONLY_TOOLS.has(t.name)) return plan === "pro" || plan === "business";
    return true;
  });
}

// ==========================================================
// Execução
// ==========================================================
export interface ToolExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  action_id?: string;
  pending_confirmation?: boolean;
}

/**
 * Loga a ação em kora_actions e (se auto-exec) executa.
 */
export async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  input: Record<string, unknown>,
  interactionId: string | null,
  reasoning: string | null,
): Promise<ToolExecutionResult> {
  const autoExec = shouldAutoExecute(toolName);
  const status = autoExec ? "auto_executed" : "pending";

  const { data: actionRow, error: actionErr } = await supabase
    .from("kora_actions")
    .insert({
      user_id: userId,
      interaction_id: interactionId,
      action_type: toolName,
      status,
      payload: input,
      reasoning,
    })
    .select("id")
    .single();

  if (actionErr || !actionRow?.id) {
    return { success: false, error: "Failed to log action" };
  }
  const actionId = actionRow.id as string;

  if (!autoExec) {
    return { success: true, pending_confirmation: true, action_id: actionId };
  }

  const result = await performAction(supabase, userId, toolName, input);
  await supabase
    .from("kora_actions")
    .update({
      status: result.success ? "executed" : "failed",
      result: result.success ? result.result : { error: result.error },
      executed_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  return { ...result, action_id: actionId };
}

/**
 * Confirma e executa uma ação que estava em status 'pending'.
 * Chamada pelo endpoint kora-confirm-action (Fase 3).
 */
export async function confirmAndExecuteAction(
  supabase: SupabaseClient,
  userId: string,
  actionId: string,
): Promise<ToolExecutionResult> {
  const { data: action } = await supabase
    .from("kora_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!action) {
    return { success: false, error: "Action not found or already processed" };
  }

  const row = action as Record<string, unknown>;
  const toolName = typeof row.action_type === "string" ? row.action_type : "";
  const payload = (row.payload as Record<string, unknown>) ?? {};

  const result = await performAction(supabase, userId, toolName, payload);
  await supabase
    .from("kora_actions")
    .update({
      status: result.success ? "executed" : "failed",
      result: result.success ? result.result : { error: result.error },
      executed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  // Caso especial: create_coaching_plan — ao confirmar, promove o plano
  // de 'pending' pra 'active' e agenda próximo check-in.
  if (toolName === "create_coaching_plan" && result.success && result.result) {
    const planId = result.result.plan_id;
    if (typeof planId === "string") {
      const nextCheckin = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("kora_coaching_plans")
        .update({ status: "active", next_checkin_at: nextCheckin })
        .eq("id", planId);
    }
  }

  return { ...result, action_id: actionId };
}

// ==========================================================
// Execução concreta de cada tool
// ==========================================================
async function performAction(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case "create_transaction":
        return await execCreateTransaction(supabase, userId, input);
      case "recategorize_transaction":
        return await execRecategorize(supabase, userId, input);
      case "create_budget":
        return await execCreateBudget(supabase, userId, input);
      case "update_budget":
        return await execUpdateBudget(supabase, userId, input);
      case "create_goal":
        return await execCreateGoal(supabase, userId, input);
      case "create_debt":
        return await execCreateDebt(supabase, userId, input);
      case "create_coaching_plan":
        return await execCreateCoachingPlan(supabase, userId, input);
      case "add_memory":
        return await execAddMemory(supabase, userId, input);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function execCreateTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const type = input.type === "income" ? "income" : "expense";
  const origin: TransactionOrigin = input.origin === "business" ? "business" : "personal";
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "amount must be a positive number" };
  }
  const description = String(input.description ?? "").trim() || "Sem descrição";
  const category = normalizeCategory(
    typeof input.category === "string" ? input.category : undefined,
    origin,
    type as TransactionType,
  );
  const date =
    typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? input.date
      : new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      amount,
      type,
      origin,
      category,
      description,
      date,
      source: "kora_brain",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { success: true, result: { transaction_id: data?.id } };
}

async function execRecategorize(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const transactionId = String(input.transaction_id ?? "");
  const newCategory = String(input.new_category ?? "").trim();
  if (!transactionId || !newCategory) {
    return { success: false, error: "transaction_id and new_category required" };
  }
  const { error } = await supabase
    .from("transactions")
    .update({ category: newCategory })
    .eq("id", transactionId)
    .eq("user_id", userId);
  if (error) throw error;
  return { success: true, result: { updated: true } };
}

async function execCreateBudget(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const category = String(input.category ?? "").trim();
  const limitAmount = Number(input.limit_amount);
  const monthYear =
    typeof input.month_year === "string" && /^\d{4}-\d{2}$/.test(input.month_year)
      ? input.month_year
      : new Date().toISOString().slice(0, 7);
  if (!category || !Number.isFinite(limitAmount) || limitAmount <= 0) {
    return { success: false, error: "category and positive limit_amount required" };
  }

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, category, month_year: monthYear, limit_amount: limitAmount },
      { onConflict: "user_id,category,month_year" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return { success: true, result: { budget_id: data?.id, month_year: monthYear } };
}

async function execUpdateBudget(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const category = String(input.category ?? "").trim();
  const newAmount = Number(input.new_amount);
  const monthYear =
    typeof input.month_year === "string" && /^\d{4}-\d{2}$/.test(input.month_year)
      ? input.month_year
      : new Date().toISOString().slice(0, 7);
  if (!category || !Number.isFinite(newAmount) || newAmount <= 0) {
    return { success: false, error: "category and positive new_amount required" };
  }
  const { error } = await supabase
    .from("budgets")
    .update({ limit_amount: newAmount })
    .eq("user_id", userId)
    .eq("category", category)
    .eq("month_year", monthYear);
  if (error) throw error;
  return { success: true, result: { updated: true, month_year: monthYear } };
}

async function execCreateGoal(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const name = String(input.name ?? "").trim();
  const targetAmount = Number(input.target_amount);
  if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { success: false, error: "name and positive target_amount required" };
  }
  const row: Record<string, unknown> = {
    user_id: userId,
    name,
    target_amount: targetAmount,
    current_amount: Number(input.initial_amount) || 0,
    start_date: new Date().toISOString().slice(0, 10),
  };
  if (typeof input.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) {
    row.deadline = input.deadline;
  }
  const { data, error } = await supabase.from("goals").insert(row).select("id").single();
  if (error) throw error;
  return { success: true, result: { goal_id: data?.id } };
}

async function execCreateDebt(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const name = String(input.name ?? "").trim();
  const totalAmount = Number(input.total_amount);
  if (!name || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { success: false, error: "name and positive total_amount required" };
  }
  // creditor/debt_type são NOT NULL no schema; gera defaults razoáveis.
  const creditor = String(input.creditor ?? name).trim() || name;
  const debtType = String(input.debt_type ?? "outros").trim() || "outros";

  const row: Record<string, unknown> = {
    user_id: userId,
    name,
    creditor,
    debt_type: debtType,
    total_amount: totalAmount,
    remaining_amount: totalAmount,
    status: "active",
  };
  if (Number.isFinite(Number(input.interest_rate))) {
    row.interest_rate = Number(input.interest_rate);
  }
  if (Number.isFinite(Number(input.remaining_installments))) {
    row.remaining_installments = Number(input.remaining_installments);
  }
  const { data, error } = await supabase.from("debts").insert(row).select("id").single();
  if (error) throw error;
  return { success: true, result: { debt_id: data?.id } };
}

interface CoachingStepInput {
  title?: unknown;
  description?: unknown;
  target_value?: unknown;
  deadline?: unknown;
}

async function execCreateCoachingPlan(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const planType = String(input.plan_type ?? "").trim();
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (!planType || !title || !description) {
    return { success: false, error: "plan_type, title, description required" };
  }
  const rawSteps = Array.isArray(input.steps) ? (input.steps as CoachingStepInput[]) : [];
  const steps = rawSteps.map((s, i) => ({
    id: `step_${i + 1}`,
    title: String(s.title ?? ""),
    description: String(s.description ?? ""),
    target_value: s.target_value ?? null,
    deadline: typeof s.deadline === "string" ? s.deadline : null,
    status: "pending",
  }));

  const row: Record<string, unknown> = {
    user_id: userId,
    plan_type: planType,
    title,
    description,
    steps,
    // Entra como pending; confirmAndExecuteAction promove pra active.
    status: "pending",
    checkin_frequency:
      typeof input.checkin_frequency === "string" ? input.checkin_frequency : "weekly",
  };
  if (typeof input.target_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.target_date)) {
    row.target_date = input.target_date;
  }

  const { data, error } = await supabase
    .from("kora_coaching_plans")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return { success: true, result: { plan_id: data?.id } };
}

async function execAddMemory(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const memoryType = String(input.memory_type ?? "");
  const content = String(input.content ?? "").trim();
  const allowedTypes = ["fact", "preference", "pattern", "event", "goal_context"];
  if (!allowedTypes.includes(memoryType) || !content) {
    return { success: false, error: "memory_type and content required" };
  }
  const importance = typeof input.importance === "number" ? input.importance : 0.5;

  const { data, error } = await supabase
    .from("kora_memory")
    .insert({
      user_id: userId,
      memory_type: memoryType,
      content,
      importance,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { success: true, result: { memory_id: data?.id } };
}

// ==========================================================
// Descrição humana de uma action pendente (pro frontend mostrar "Confirma...?")
// ==========================================================
export function describeAction(toolName: string, input: Record<string, unknown>): string {
  const brl = (v: unknown) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

  switch (toolName) {
    case "create_transaction":
      return `Registrar ${input.type === "income" ? "receita" : "gasto"} de ${brl(input.amount)} em ${String(input.category ?? "")} (${String(input.description ?? "")})`;
    case "create_budget":
      return `Criar orçamento de ${brl(input.limit_amount)} para ${String(input.category ?? "")}`;
    case "update_budget":
      return `Ajustar orçamento de ${String(input.category ?? "")} para ${brl(input.new_amount)}`;
    case "create_goal":
      return `Criar meta "${String(input.name ?? "")}" — ${brl(input.target_amount)}${typeof input.deadline === "string" ? ` até ${input.deadline}` : ""}`;
    case "create_debt":
      return `Registrar dívida "${String(input.name ?? "")}" no valor de ${brl(input.total_amount)}`;
    case "create_coaching_plan":
      return `Iniciar plano de coaching: "${String(input.title ?? "")}" (${Array.isArray(input.steps) ? input.steps.length : 0} passos)`;
    default:
      return `Ação: ${toolName}`;
  }
}

// ==========================================================
// Helper pro orchestrator injetar categorias válidas no prompt
// ==========================================================
export function categoriesPromptSnippet(origin: TransactionOrigin): string {
  const expense = getValidCategories(origin, "expense");
  const income = getValidCategories(origin, "income");
  return `Categorias válidas (perfil ${origin}):
- Despesas: ${expense.join(", ")}
- Receitas: ${income.join(", ")}

Ao criar transação, use SÓ categorias dessa lista. Se não encaixar, use "Outros" (despesa) ou "Outras receitas" (receita).`;
}

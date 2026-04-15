import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Adiciona um novo lançamento financeiro (receita ou despesa).",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descrição do lançamento" },
          amount: { type: "number", description: "Valor (sempre positivo)" },
          type: { type: "string", enum: ["income", "expense"], description: "income ou expense" },
          category: { type: "string", description: "Categoria" },
          origin: { type: "string", enum: ["personal", "business"], description: "personal ou business" },
          date: { type: "string", description: "YYYY-MM-DD (default: hoje)" },
        },
        required: ["description", "amount", "type", "category", "origin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_transaction",
      description: "Atualiza um lançamento existente.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string" },
          description: { type: "string" },
          amount: { type: "number" },
          category: { type: "string" },
          type: { type: "string", enum: ["income", "expense"] },
          origin: { type: "string", enum: ["personal", "business"] },
          date: { type: "string" },
        },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transaction",
      description: "Exclui (soft delete) um lançamento.",
      parameters: {
        type: "object",
        properties: { transaction_id: { type: "string" } },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_transactions",
      description: "Busca lançamentos por descrição, categoria ou tipo.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto para buscar na descrição" },
          category: { type: "string" },
          type: { type: "string", enum: ["income", "expense"] },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_goal",
      description: "Cria uma nova meta financeira.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          target_amount: { type: "number" },
          current_amount: { type: "number" },
          deadline: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["name", "target_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal",
      description: "Atualiza uma meta existente.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string" },
          name: { type: "string" },
          target_amount: { type: "number" },
          current_amount: { type: "number" },
          deadline: { type: "string" },
        },
        required: ["goal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_investment",
      description: "Adiciona um novo investimento.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          asset_type: { type: "string", description: "Renda Fixa, Ações, FIIs, Cripto, Tesouro, Poupança, Outro" },
          invested_amount: { type: "number" },
          current_amount: { type: "number" },
        },
        required: ["name", "asset_type", "invested_amount", "current_amount"],
      },
    },
  },
  // ===== NEW TOOLS =====
  {
    type: "function",
    function: {
      name: "add_budget",
      description: "Cria ou atualiza um orçamento mensal para uma categoria.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Categoria do orçamento" },
          limit_amount: { type: "number", description: "Valor limite do orçamento" },
          month_year: { type: "string", description: "Mês no formato YYYY-MM (default: mês atual)" },
        },
        required: ["category", "limit_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_scheduled_bill",
      description: "Adiciona uma conta a pagar/agendada.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          category: { type: "string" },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          recurrent: { type: "boolean", description: "Se é recorrente" },
          frequency: { type: "string", enum: ["weekly", "monthly", "yearly"] },
          origin: { type: "string", enum: ["personal", "business"] },
        },
        required: ["description", "amount", "category", "due_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pay_bill",
      description: "Marca uma conta a pagar como paga.",
      parameters: {
        type: "object",
        properties: { bill_id: { type: "string" } },
        required: ["bill_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_debt",
      description: "Adiciona uma nova dívida.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          creditor: { type: "string", description: "Credor/instituição" },
          total_amount: { type: "number" },
          remaining_amount: { type: "number" },
          debt_type: { type: "string", enum: ["credit_card", "personal_loan", "bank_loan", "overdraft", "friend_family", "store_credit", "medical", "tax", "other"] },
          interest_rate: { type: "number", description: "Taxa de juros mensal %" },
          due_day: { type: "number", description: "Dia do vencimento 1-31" },
          min_payment: { type: "number" },
        },
        required: ["name", "creditor", "total_amount", "remaining_amount", "debt_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_debt_payment",
      description: "Registra um pagamento em uma dívida existente.",
      parameters: {
        type: "object",
        properties: {
          debt_id: { type: "string" },
          amount: { type: "number" },
          payment_date: { type: "string", description: "YYYY-MM-DD (default: hoje)" },
          notes: { type: "string" },
        },
        required: ["debt_id", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_recurring_transaction",
      description: "Cria uma transação recorrente (receita ou despesa fixa mensal/semanal/anual).",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string" },
          origin: { type: "string", enum: ["personal", "business"] },
          frequency: { type: "string", enum: ["weekly", "monthly", "yearly"] },
          day_of_month: { type: "number", description: "Dia do mês 1-31" },
          next_date: { type: "string", description: "YYYY-MM-DD próxima data" },
        },
        required: ["description", "amount", "type", "category", "origin", "frequency", "next_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_credit_card",
      description: "Adiciona um novo cartão de crédito.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          credit_limit: { type: "number" },
          last_four: { type: "string", description: "Últimos 4 dígitos" },
          network: { type: "string", enum: ["visa", "mastercard", "elo", "amex", "hipercard", "other"] },
          closing_day: { type: "number", description: "Dia de fechamento 1-31" },
          due_day: { type: "number", description: "Dia de vencimento 1-31" },
        },
        required: ["name", "credit_limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Gera um resumo financeiro completo do usuário com análise de tendências, alertas e sugestões.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

async function executeTool(
  supabase: any,
  userId: string,
  name: string,
  args: any
): Promise<{ success: boolean; message: string; data?: any }> {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthYear = today.slice(0, 7);
  try {
    switch (name) {
      case "add_transaction": {
        const { data, error } = await supabase.from("transactions").insert({
          user_id: userId, description: args.description, amount: args.amount,
          type: args.type, category: args.category, origin: args.origin,
          date: args.date || today,
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Lançamento "${args.description}" de R$ ${args.amount.toFixed(2)} (${args.type === 'income' ? 'receita' : 'despesa'}) adicionado.`, data };
      }
      case "update_transaction": {
        const updates: any = {};
        if (args.description) updates.description = args.description;
        if (args.amount !== undefined) updates.amount = args.amount;
        if (args.category) updates.category = args.category;
        if (args.type) updates.type = args.type;
        if (args.origin) updates.origin = args.origin;
        if (args.date) updates.date = args.date;
        const { data, error } = await supabase.from("transactions").update(updates).eq("id", args.transaction_id).eq("user_id", userId).select().single();
        if (error) throw error;
        return { success: true, message: `Lançamento atualizado com sucesso.`, data };
      }
      case "delete_transaction": {
        const { error } = await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", args.transaction_id).eq("user_id", userId);
        if (error) throw error;
        return { success: true, message: `Lançamento excluído.` };
      }
      case "search_transactions": {
        let query = supabase.from("transactions").select("id, description, amount, type, category, origin, date").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }).limit(args.limit || 10);
        if (args.query) query = query.ilike("description", `%${args.query}%`);
        if (args.category) query = query.eq("category", args.category);
        if (args.type) query = query.eq("type", args.type);
        const { data, error } = await query;
        if (error) throw error;
        return { success: true, message: `Encontrados ${(data || []).length} lançamentos.`, data: data || [] };
      }
      case "add_goal": {
        const { data, error } = await supabase.from("goals").insert({
          user_id: userId, name: args.name, target_amount: args.target_amount,
          current_amount: args.current_amount || 0, deadline: args.deadline || null,
          start_date: today,
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Meta "${args.name}" criada (alvo: R$ ${args.target_amount.toFixed(2)}).`, data };
      }
      case "update_goal": {
        const updates: any = {};
        if (args.name) updates.name = args.name;
        if (args.target_amount !== undefined) updates.target_amount = args.target_amount;
        if (args.current_amount !== undefined) updates.current_amount = args.current_amount;
        if (args.deadline) updates.deadline = args.deadline;
        const { data, error } = await supabase.from("goals").update(updates).eq("id", args.goal_id).eq("user_id", userId).select().single();
        if (error) throw error;
        return { success: true, message: `Meta atualizada.`, data };
      }
      case "add_investment": {
        const { data, error } = await supabase.from("investments").insert({
          user_id: userId, name: args.name, asset_type: args.asset_type,
          invested_amount: args.invested_amount, current_amount: args.current_amount, date: today,
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Investimento "${args.name}" adicionado.`, data };
      }
      // ===== NEW TOOLS =====
      case "add_budget": {
        const monthYear = args.month_year || currentMonthYear;
        // Upsert: check if exists
        const { data: existing } = await supabase.from("budgets").select("id").eq("user_id", userId).eq("category", args.category).eq("month_year", monthYear).maybeSingle();
        if (existing) {
          const { error } = await supabase.from("budgets").update({ limit_amount: args.limit_amount }).eq("id", existing.id);
          if (error) throw error;
          return { success: true, message: `Orçamento de "${args.category}" atualizado para R$ ${args.limit_amount.toFixed(2)} em ${monthYear}.` };
        }
        const { error } = await supabase.from("budgets").insert({ user_id: userId, category: args.category, limit_amount: args.limit_amount, month_year: monthYear });
        if (error) throw error;
        return { success: true, message: `Orçamento de R$ ${args.limit_amount.toFixed(2)} criado para "${args.category}" em ${monthYear}.` };
      }
      case "add_scheduled_bill": {
        const { data, error } = await supabase.from("scheduled_bills").insert({
          user_id: userId, description: args.description, amount: args.amount,
          category: args.category, due_date: args.due_date,
          recurrent: args.recurrent || false, frequency: args.frequency || null,
          origin: args.origin || "personal", status: "pending",
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Conta "${args.description}" de R$ ${args.amount.toFixed(2)} agendada para ${args.due_date}.`, data };
      }
      case "pay_bill": {
        const { error } = await supabase.from("scheduled_bills").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", args.bill_id).eq("user_id", userId);
        if (error) throw error;
        return { success: true, message: `Conta marcada como paga.` };
      }
      case "add_debt": {
        const { data, error } = await supabase.from("debts").insert({
          user_id: userId, name: args.name, creditor: args.creditor,
          total_amount: args.total_amount, remaining_amount: args.remaining_amount,
          debt_type: args.debt_type, interest_rate: args.interest_rate || 0,
          due_day: args.due_day || null, min_payment: args.min_payment || 0,
          status: "active", strategy: "snowball",
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Dívida "${args.name}" de R$ ${args.total_amount.toFixed(2)} adicionada (credor: ${args.creditor}).`, data };
      }
      case "add_debt_payment": {
        const { error: payError } = await supabase.from("debt_payments").insert({
          user_id: userId, debt_id: args.debt_id, amount: args.amount,
          payment_date: args.payment_date || today, notes: args.notes || null,
        });
        if (payError) throw payError;
        // Update remaining
        const { data: debt } = await supabase.from("debts").select("remaining_amount").eq("id", args.debt_id).single();
        if (debt) {
          const newRemaining = Math.max(0, debt.remaining_amount - args.amount);
          await supabase.from("debts").update({
            remaining_amount: newRemaining,
            status: newRemaining <= 0 ? "paid" : "active",
          }).eq("id", args.debt_id);
        }
        return { success: true, message: `Pagamento de R$ ${args.amount.toFixed(2)} registrado na dívida.` };
      }
      case "add_recurring_transaction": {
        const { error } = await supabase.from("recurring_transactions").insert({
          user_id: userId, description: args.description, amount: args.amount,
          type: args.type, category: args.category, origin: args.origin,
          frequency: args.frequency, day_of_month: args.day_of_month || null,
          next_date: args.next_date, active: true,
        });
        if (error) throw error;
        return { success: true, message: `Transação recorrente "${args.description}" de R$ ${args.amount.toFixed(2)} (${args.frequency}) criada.` };
      }
      case "add_credit_card": {
        const { data, error } = await supabase.from("credit_cards").insert({
          user_id: userId, name: args.name, credit_limit: args.credit_limit,
          last_four: args.last_four || null, network: args.network || "visa",
          closing_day: args.closing_day || null, due_day: args.due_day || null,
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Cartão "${args.name}" adicionado (limite: R$ ${args.credit_limit.toFixed(2)}).`, data };
      }
      case "get_financial_summary": {
        // Fetch comprehensive data
        const [txRes, goalsRes, debtsRes, budgetsRes, billsRes, cardsRes, investRes] = await Promise.all([
          supabase.from("transactions").select("amount, type, category, date").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }).limit(200),
          supabase.from("goals").select("name, target_amount, current_amount, deadline").eq("user_id", userId).is("deleted_at", null),
          supabase.from("debts").select("name, remaining_amount, total_amount, interest_rate, status").eq("user_id", userId).is("deleted_at", null),
          supabase.from("budgets").select("category, limit_amount, month_year").eq("user_id", userId).eq("month_year", currentMonthYear),
          supabase.from("scheduled_bills").select("description, amount, due_date, status").eq("user_id", userId).eq("status", "pending"),
          supabase.from("credit_cards").select("name, credit_limit, used_amount").eq("user_id", userId),
          supabase.from("investments").select("name, invested_amount, current_amount, asset_type").eq("user_id", userId),
        ]);

        const txs = txRes.data || [];
        const thisMonthTxs = txs.filter((t: any) => t.date?.startsWith(currentMonthYear));
        const income = thisMonthTxs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
        const expense = thisMonthTxs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
        const totalDebt = (debtsRes.data || []).filter((d: any) => d.status === "active").reduce((s: number, d: any) => s + d.remaining_amount, 0);
        const totalInvested = (investRes.data || []).reduce((s: number, i: any) => s + i.invested_amount, 0);
        const totalInvestCurrent = (investRes.data || []).reduce((s: number, i: any) => s + i.current_amount, 0);

        // Category breakdown
        const catExpenses: Record<string, number> = {};
        thisMonthTxs.filter((t: any) => t.type === "expense").forEach((t: any) => {
          catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
        });

        // Budget usage
        const budgetUsage = (budgetsRes.data || []).map((b: any) => ({
          category: b.category,
          limit: b.limit_amount,
          spent: catExpenses[b.category] || 0,
          pct: Math.round(((catExpenses[b.category] || 0) / b.limit_amount) * 100),
        }));

        return {
          success: true,
          message: "Resumo financeiro completo gerado.",
          data: {
            month: currentMonthYear,
            income, expense, balance: income - expense,
            savings_rate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
            total_debt: totalDebt,
            total_invested: totalInvested,
            investment_return: totalInvestCurrent - totalInvested,
            goals: goalsRes.data || [],
            pending_bills: billsRes.data || [],
            budget_usage: budgetUsage,
            top_expenses: Object.entries(catExpenses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, val]) => ({ category: cat, amount: val })),
            cards: cardsRes.data || [],
            active_debts: (debtsRes.data || []).filter((d: any) => d.status === "active"),
          },
        };
      }
      default:
        return { success: false, message: `Ferramenta "${name}" não reconhecida.` };
    }
  } catch (e: any) {
    console.error(`Tool ${name} error:`, e);
    return { success: false, message: `Erro ao executar ${name}: ${e.message}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnon);

    // Validate user
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("Auth validation failed:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch comprehensive financial context
    const [txRes, goalsRes, configRes, investRes, debtsRes, budgetsRes, billsRes, cardsRes, recurringRes, profileRes] = await Promise.all([
      serviceClient.from("transactions").select("id, description, amount, type, category, origin, date").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }).limit(50),
      serviceClient.from("goals").select("*").eq("user_id", userId).is("deleted_at", null),
      serviceClient.from("user_config").select("*").eq("user_id", userId).single(),
      serviceClient.from("investments").select("*").eq("user_id", userId),
      serviceClient.from("debts").select("*").eq("user_id", userId).is("deleted_at", null),
      serviceClient.from("budgets").select("*").eq("user_id", userId),
      serviceClient.from("scheduled_bills").select("*").eq("user_id", userId).order("due_date", { ascending: true }).limit(20),
      serviceClient.from("credit_cards").select("*").eq("user_id", userId),
      serviceClient.from("recurring_transactions").select("*").eq("user_id", userId).eq("active", true),
      serviceClient.from("profiles").select("full_name").eq("id", userId).single(),
    ]);

    const transactions = txRes.data || [];
    const goals = goalsRes.data || [];
    const config = configRes.data;
    const investments = investRes.data || [];
    const debts = debtsRes.data || [];
    const budgets = budgetsRes.data || [];
    const bills = billsRes.data || [];
    const cards = cardsRes.data || [];
    const recurring = recurringRes.data || [];
    const userName = profileRes.data?.full_name || "usuário";

    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthTx = transactions.filter((t: any) => t.date?.startsWith(currentMonth));
    const totalIncome = thisMonthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
    const totalExpense = thisMonthTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
    const totalDebt = debts.filter((d: any) => d.status === "active").reduce((s: number, d: any) => s + d.remaining_amount, 0);

    // Category spending
    const catExpenses: Record<string, number> = {};
    thisMonthTx.filter((t: any) => t.type === "expense").forEach((t: any) => {
      catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
    });

    const financialContext = `
Contexto financeiro de ${userName}:
- Perfil: ${config?.profile_type || "personal"} | Moeda: ${config?.currency || "BRL"}
- Score financeiro: ${config?.financial_score || 0}/1000 | Nível: ${config?.level || "iniciante"} | Streak: ${config?.streak_days || 0} dias

📊 RESUMO DO MÊS (${currentMonth}):
- Receita: R$ ${totalIncome.toFixed(2)} | Despesa: R$ ${totalExpense.toFixed(2)} | Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}
- Taxa de poupança: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%

💳 LANÇAMENTOS RECENTES (com IDs para referência):
${transactions.slice(0, 25).map((t: any) => `  [${t.id}] ${t.date} | ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.type} | ${t.category}`).join("\n") || "  Nenhum"}

📂 GASTOS POR CATEGORIA ESTE MÊS:
${Object.entries(catExpenses).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, val]) => `  • ${cat}: R$ ${(val as number).toFixed(2)}`).join("\n") || "  Nenhum gasto"}

📋 ORÇAMENTOS ATIVOS:
${budgets.filter((b: any) => b.month_year === currentMonth).map((b: any) => {
  const spent = catExpenses[b.category] || 0;
  const pct = Math.round((spent / b.limit_amount) * 100);
  return `  • ${b.category}: R$ ${spent.toFixed(2)} / R$ ${b.limit_amount.toFixed(2)} (${pct}%) ${pct > 90 ? '⚠️ QUASE NO LIMITE' : pct > 100 ? '🔴 ESTOURADO' : '✅'}`;
}).join("\n") || "  Nenhum orçamento definido"}

🎯 METAS:
${goals.map((g: any) => `  [${g.id}] ${g.name}: R$ ${(g.current_amount || 0).toFixed(2)} / R$ ${g.target_amount.toFixed(2)} (${Math.round(((g.current_amount || 0) / g.target_amount) * 100)}%)${g.deadline ? ` prazo: ${g.deadline}` : ''}`).join("\n") || "  Nenhuma meta"}

💰 INVESTIMENTOS:
${investments.map((i: any) => {
  const ret = ((i.current_amount - i.invested_amount) / i.invested_amount * 100).toFixed(1);
  return `  [${i.id}] ${i.name} (${i.asset_type}): R$ ${i.current_amount.toFixed(2)} (retorno: ${ret}%)`;
}).join("\n") || "  Nenhum investimento"}

💸 DÍVIDAS ATIVAS:
${debts.filter((d: any) => d.status === "active").map((d: any) => `  [${d.id}] ${d.name} (${d.creditor}): R$ ${d.remaining_amount.toFixed(2)} restante de R$ ${d.total_amount.toFixed(2)} | juros: ${d.interest_rate || 0}%/mês`).join("\n") || "  Nenhuma dívida"}
- Total de dívidas ativas: R$ ${totalDebt.toFixed(2)}

📅 CONTAS A PAGAR (próximas):
${bills.filter((b: any) => b.status === "pending").slice(0, 10).map((b: any) => `  [${b.id}] ${b.due_date} | ${b.description}: R$ ${b.amount.toFixed(2)} ${b.recurrent ? '🔄' : ''}`).join("\n") || "  Nenhuma conta pendente"}

💳 CARTÕES DE CRÉDITO:
${cards.map((c: any) => `  [${c.id}] ${c.name} (${c.network || 'visa'}): R$ ${(c.used_amount || 0).toFixed(2)} / R$ ${c.credit_limit.toFixed(2)} usado${c.due_day ? ` | vence dia ${c.due_day}` : ''}`).join("\n") || "  Nenhum cartão"}

🔄 TRANSAÇÕES RECORRENTES:
${recurring.map((r: any) => `  [${r.id}] ${r.description}: R$ ${r.amount.toFixed(2)} (${r.type}, ${r.frequency}) próxima: ${r.next_date}`).join("\n") || "  Nenhuma recorrente"}
`;

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é o Assistente Financeiro FinDash IA — um consultor financeiro pessoal inteligente, proativo e empático.
Seu nome é **FinDash IA**. Trate o usuário pelo nome (${userName}).

## Personalidade
- Profissional mas amigável. Use linguagem clara e acessível.
- Seja proativo: ao analisar dados, ofereça insights e sugestões sem ser perguntado.
- Use emojis com moderação para tornar a conversa agradável.
- Formate com markdown: use **negrito**, listas e tabelas quando útil.

## Capacidades
Você pode EXECUTAR ações nos dados financeiros do usuário usando as ferramentas disponíveis:
- ✅ Adicionar, atualizar e excluir lançamentos (receitas/despesas)
- ✅ Criar e atualizar metas financeiras
- ✅ Adicionar investimentos
- ✅ Criar/atualizar orçamentos por categoria
- ✅ Agendar contas a pagar e marcar como pagas
- ✅ Registrar dívidas e pagamentos de dívidas
- ✅ Criar transações recorrentes (salário, aluguel, etc.)
- ✅ Adicionar cartões de crédito
- ✅ Gerar resumo financeiro completo com análise

## Regras
1. NUNCA invente dados. Use APENAS o contexto fornecido.
2. Quando o usuário pedir uma alteração, USE AS FERRAMENTAS para executar.
3. Para atualizar/excluir algo, primeiro use search_transactions se precisar encontrar o ID.
4. Sempre confirme as ações com detalhes específicos do que foi feito.
5. Ao analisar finanças, identifique padrões, riscos e oportunidades.
6. Se um orçamento estiver estourado ou quase, alerte proativamente.
7. Se houver contas a pagar próximas, lembre o usuário.
8. Sugira ações concretas baseadas na situação financeira.

## Análise Inteligente
Quando o usuário perguntar sobre suas finanças:
- Compare receita vs despesa e calcule taxa de poupança
- Identifique as top 3 categorias de gasto
- Verifique orçamentos estourados
- Analise progresso das metas
- Avalie risco das dívidas (juros altos)
- Sugira onde economizar
- Projete tendências se possível

${financialContext}`;

    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let finalResponse = "";
    let actionsSummary: string[] = [];
    let maxIterations = 8;

    while (maxIterations > 0) {
      maxIterations--;

      let response: Response;
      try {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: aiMessages,
            tools: TOOLS,
            stream: false,
          }),
        });
      } catch (fetchErr) {
        console.error("Fetch to AI gateway failed:", fetchErr);
        return new Response(JSON.stringify({ error: "Falha ao conectar com o serviço de IA." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("AI gateway error:", response.status, errBody);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let result: any;
      try {
        result = await response.json();
      } catch {
        console.error("Failed to parse AI response");
        return new Response(JSON.stringify({ error: "Resposta inválida da IA." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const choice = result.choices?.[0];
      if (!choice) {
        console.error("No choices:", JSON.stringify(result).slice(0, 500));
        return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        aiMessages.push(msg);
        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: any;
          try {
            fnArgs = typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments || {};
          } catch { fnArgs = {}; }

          console.log(`Executing tool: ${fnName}`, JSON.stringify(fnArgs));
          const toolResult = await executeTool(serviceClient, userId, fnName, fnArgs);
          actionsSummary.push(toolResult.message);
          aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
        }
        continue;
      }

      finalResponse = msg.content || "";
      break;
    }

    if (!finalResponse && actionsSummary.length > 0) {
      finalResponse = "✅ Ações executadas com sucesso!";
    } else if (!finalResponse) {
      finalResponse = "Desculpe, não consegui processar sua solicitação. Tente novamente.";
    }

    return new Response(JSON.stringify({
      reply: finalResponse,
      actions: actionsSummary.length > 0 ? actionsSummary : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

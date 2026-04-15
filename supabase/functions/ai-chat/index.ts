import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ━━━ TOOLS (preserved from existing implementation) ━━━
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
  {
    type: "function",
    function: {
      name: "add_budget",
      description: "Cria ou atualiza um orçamento mensal para uma categoria.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          limit_amount: { type: "number" },
          month_year: { type: "string", description: "YYYY-MM (default: mês atual)" },
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
          recurrent: { type: "boolean" },
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
          creditor: { type: "string" },
          total_amount: { type: "number" },
          remaining_amount: { type: "number" },
          debt_type: { type: "string", enum: ["credit_card", "personal_loan", "bank_loan", "overdraft", "friend_family", "store_credit", "medical", "tax", "other"] },
          interest_rate: { type: "number" },
          due_day: { type: "number" },
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
          payment_date: { type: "string" },
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
      description: "Cria uma transação recorrente.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string" },
          origin: { type: "string", enum: ["personal", "business"] },
          frequency: { type: "string", enum: ["weekly", "monthly", "yearly"] },
          day_of_month: { type: "number" },
          next_date: { type: "string" },
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
          last_four: { type: "string" },
          network: { type: "string", enum: ["visa", "mastercard", "elo", "amex", "hipercard", "other"] },
          closing_day: { type: "number" },
          due_day: { type: "number" },
        },
        required: ["name", "credit_limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Gera um resumo financeiro completo do usuário.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ━━━ TOOL EXECUTOR (preserved) ━━━
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
          current_amount: args.current_amount || 0, deadline: args.deadline || null, start_date: today,
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
      case "add_budget": {
        const monthYear = args.month_year || currentMonthYear;
        const { data: existing } = await supabase.from("budgets").select("id").eq("user_id", userId).eq("category", args.category).eq("month_year", monthYear).maybeSingle();
        if (existing) {
          const { error } = await supabase.from("budgets").update({ limit_amount: args.limit_amount }).eq("id", existing.id);
          if (error) throw error;
          return { success: true, message: `Orçamento de "${args.category}" atualizado para R$ ${args.limit_amount.toFixed(2)}.` };
        }
        const { error } = await supabase.from("budgets").insert({ user_id: userId, category: args.category, limit_amount: args.limit_amount, month_year: monthYear });
        if (error) throw error;
        return { success: true, message: `Orçamento de R$ ${args.limit_amount.toFixed(2)} criado para "${args.category}".` };
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
        return { success: true, message: `Dívida "${args.name}" de R$ ${args.total_amount.toFixed(2)} adicionada.`, data };
      }
      case "add_debt_payment": {
        const { error: payError } = await supabase.from("debt_payments").insert({
          user_id: userId, debt_id: args.debt_id, amount: args.amount,
          payment_date: args.payment_date || today, notes: args.notes || null,
        });
        if (payError) throw payError;
        const { data: debt } = await supabase.from("debts").select("remaining_amount").eq("id", args.debt_id).single();
        if (debt) {
          const newRemaining = Math.max(0, debt.remaining_amount - args.amount);
          await supabase.from("debts").update({ remaining_amount: newRemaining, status: newRemaining <= 0 ? "paid" : "active" }).eq("id", args.debt_id);
        }
        return { success: true, message: `Pagamento de R$ ${args.amount.toFixed(2)} registrado.` };
      }
      case "add_recurring_transaction": {
        const { error } = await supabase.from("recurring_transactions").insert({
          user_id: userId, description: args.description, amount: args.amount,
          type: args.type, category: args.category, origin: args.origin,
          frequency: args.frequency, day_of_month: args.day_of_month || null,
          next_date: args.next_date, active: true,
        });
        if (error) throw error;
        return { success: true, message: `Recorrente "${args.description}" de R$ ${args.amount.toFixed(2)} criada.` };
      }
      case "add_credit_card": {
        const { data, error } = await supabase.from("credit_cards").insert({
          user_id: userId, name: args.name, credit_limit: args.credit_limit,
          last_four: args.last_four || null, network: args.network || "visa",
          closing_day: args.closing_day || null, due_day: args.due_day || null,
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Cartão "${args.name}" adicionado.`, data };
      }
      case "get_financial_summary": {
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
        const catExpenses: Record<string, number> = {};
        thisMonthTxs.filter((t: any) => t.type === "expense").forEach((t: any) => { catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount; });
        return {
          success: true, message: "Resumo financeiro completo gerado.",
          data: {
            month: currentMonthYear, income, expense, balance: income - expense,
            savings_rate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
            total_debt: totalDebt,
            goals: goalsRes.data || [], pending_bills: billsRes.data || [],
            top_expenses: Object.entries(catExpenses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, val]) => ({ category: cat, amount: val })),
            cards: cardsRes.data || [], active_debts: (debtsRes.data || []).filter((d: any) => d.status === "active"),
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

// ━━━ INTENT DETECTION ━━━
type Intent = 'debt_help' | 'investment_advice' | 'budget_analysis' | 'goal_planning' | 'emergency_fund' | 'spending_analysis' | 'salary_question' | 'tax_question' | 'crisis_mode' | 'general';

function detectIntent(message: string): Intent {
  const msg = message.toLowerCase();
  if (/(dívida|divida|devendo|debit|negativ|endividado|rotativo|fatura|parcela|juros|cobra|atraso|serasa|spc|nome sujo)/i.test(msg)) return 'debt_help';
  if (/(investir|investimento|aplicar|rentabilidade|cdb|lci|lca|tesouro|ação|ações|fii|fundo|etf|renda fixa|renda variável|bolsa|b3|ibovespa|previdência|pgbl|vgbl)/i.test(msg)) return 'investment_advice';
  if (/(orçamento|orcamento|gastar|gasto|categoria|despesa|receita|sobrar|economizar|cortar|reduzir gasto|50.30.20)/i.test(msg)) return 'budget_analysis';
  if (/(meta|objetivo|sonho|comprar|juntar|poupar|viagem|casa própria|carro|aposentadoria|reserva|emergência|emergencia)/i.test(msg)) return 'goal_planning';
  if (/(salário|salario|renda|aumento|CLT|MEI|autônomo|autonomo|FGTS|13|décimo|férias|pró-labore|pro-labore)/i.test(msg)) return 'salary_question';
  if (/(imposto|IR|IRPF|declarar|restituição|tributo|nota fiscal|INSS|deducao|dedução|isento)/i.test(msg)) return 'tax_question';
  if (/(desespero|não consigo|nao consigo|sem dinheiro|falido|quebrado|socorro|ajuda urgente|não sei o que fazer|desistir|impossível|impossivel)/i.test(msg)) return 'crisis_mode';
  if (/(onde posso economizar|quanto gastei|análise|resumo|como estão|situação|diagnóstico)/i.test(msg)) return 'spending_analysis';
  return 'general';
}

function getIntentInstructions(intent: Intent): string {
  const map: Record<string, string> = {
    debt_help: `
🚨 MODO DÍVIDAS ATIVADO:
- Use os dados reais de dívidas do usuário
- Calcule o custo mensal de juros: saldo × taxa_mensal
- Calcule taxa efetiva anual: (1 + taxa_mensal/100)^12 - 1
- Se tem rotativo do cartão: PRIORIDADE MÁXIMA (400-500% a.a.)
- Recomende Avalanche (maior juros primeiro) se dívidas com taxas diferentes
- Recomende Snowball (menor saldo primeiro) se pessoa desmotivada
- Calcule prazo de quitação: n = -ln(1 - i×PV/PMT) / ln(1+i)
- Mencione a Lei do Superendividamento (14.181/2021) se endividamento grave
- Mencione prescrição de 5 anos se dívida antiga
- Tom: empático e prático, não assustador
- Normalize: "6 em cada 10 brasileiros passam por isso"`,

    investment_advice: `
📈 MODO INVESTIMENTOS ATIVADO:
- PRIMEIRO verifique se tem reserva de emergência (3-6 meses de despesas)
- PRIMEIRO verifique se tem dívidas com juros altos (se sim, PAGAR ANTES)
- Siga a pirâmide: Reserva → Renda Fixa → FIIs → Ações/ETFs
- Tesouro Selic: liquidez diária, seguro para emergência
- CDB: garantido pelo FGC até R$ 250k/CPF/instituição
- LCI/LCA: ISENTOS de IR para PF
- Compare: LCI 10% ≈ CDB 12.5% (para quem paga 20% IR)
- FIIs: dividendos mensais isentos de IR
- ETFs: BOVA11 (BR), IVVB11 (EUA) — diversificação barata
- PGBL: só se declaração completa, deduz até 12% da renda
- Nunca recomendar produto específico de banco/corretora
- Nunca prometer rendimento garantido`,

    budget_analysis: `
💰 MODO ORÇAMENTO ATIVADO:
- Compare gastos reais com a regra 50-30-20 adaptada
- 50% necessidades, 30% desejos, 20% futuro
- Se endividado: inverter para 20% desejos, 30% futuro
- Identifique a categoria com maior desvio do ideal
- Calcule: se reduzir X% em [categoria], economizaria R$ Y/mês
- Alerte sobre delivery (~40% mais caro que cozinhar)
- Custo por uso: academia R$ 200 ÷ 2 visitas = R$ 100/visita
- Mencione custo de oportunidade: R$ investido em 10 anos = R$ X
- Sugira automação de transferência na data do salário`,

    goal_planning: `
🎯 MODO METAS ATIVADO:
- Calcule aporte mensal necessário: meta_restante ÷ meses_até_prazo
- Projete data de conclusão com o ritmo atual
- Se meta de casa: FGTS após 3 anos, MCMV até R$ 8k renda, entrada 20-30%
- Se meta de carro: valor ≤ 6 meses de salário, depreciação 20% 1º ano
- Se aposentadoria: regra dos 4%, R$ 5k/mês = ~R$ 1.5M investido
- Juros compostos: R$ 500/mês × 30 anos @ 0.8%/mês = R$ 700k+
- Framework SMART: Específica, Mensurável, Atingível, Relevante, Temporal`,

    crisis_mode: `
🆘 MODO CRISE ATIVADO — TOM MÁXIMO DE EMPATIA:
- Comece validando a emoção: "Entendo como é difícil essa situação"
- Normalize: "Muitos brasileiros passam por isso — não é culpa sua"
- Foque em UMA ÚNICA ação imediata e simples
- Não sobrecarregue com informação
- Recursos gratuitos:
  • Procon: cobranças abusivas
  • Defensoria Pública: orientação jurídica gratuita
  • Serasa Limpa Nome: negociação pelo app
  • CAPS: apoio psicológico gratuito pelo SUS
  • CVV 188: se estiver em crise emocional
- Lei do Superendividamento protege o mínimo existencial
- Ofereça um próximo passo MUITO concreto e pequeno`,

    spending_analysis: `
📊 MODO ANÁLISE ATIVADO:
- Mostre ranking de categorias com valores reais
- Compare este mês vs mês anterior (% mudança)
- Identifique os 3 maiores aumentos de gasto
- Calcule gasto médio diário
- Identifique padrões: fins de semana, delivery, compras por impulso
- Sugira cortes específicos com valores calculados`,

    salary_question: `
💼 MODO TRABALHO/RENDA ATIVADO:
- CLT: provisionar 13º (1/12 mês), férias (+1/3), FGTS (8% — não é renda)
- MEI 2025: limite R$ 81k/ano (R$ 6.750/mês), DAS ~R$ 71-75
- Autônomo: separar 15-20% para IR, pagar INSS via carnê
- Pró-labore: retirada com INSS para não perder benefícios
- Portabilidade de salário: direito de trocar conta sem autorização
- INSS 2025: 7.5% até R$ 1.518 / 9% / 12% / 14%`,

    tax_question: `
🧾 MODO IMPOSTOS ATIVADO:
- IR 2025: isento até R$ 2.824; 7.5% / 15% / 22.5% / 27.5%
- Obrigatório declarar: renda > R$ 33.888/ano
- Despesas dedutíveis: saúde (sem limite), educação (até R$ 3.561)
- Dependentes: R$ 2.275 cada
- PGBL: deduz até 12% da renda tributável (declaração completa)
- Ações: isento se vendas < R$ 20k/mês; day trade: 20% sempre
- Dividendos: isentos para PF
- FIIs: dividendos isentos, ganho de capital 20%
- Multa por não declarar: R$ 165,74 ou 1.5% do imposto devido`,
  };
  return map[intent] || '';
}

// ━━━ PRE-COMPUTED FINANCIAL ANALYSIS ━━━
function buildDebtAnalysis(debts: any[]): string {
  const activeDebts = debts.filter((d: any) => d.status === "active");
  if (activeDebts.length === 0) return "  Nenhuma dívida ativa ✅";

  return activeDebts.sort((a: any, b: any) => (b.interest_rate || 0) - (a.interest_rate || 0)).map((d: any) => {
    const monthlyRate = (d.interest_rate || 0) / 100;
    const monthlyCost = d.remaining_amount * monthlyRate;
    const annualRate = monthlyRate > 0 ? ((Math.pow(1 + monthlyRate, 12) - 1) * 100).toFixed(1) : "0";
    const minPay = d.min_payment || 0;
    let monthsToPayoff = "N/A";
    if (minPay > monthlyCost && monthlyRate > 0) {
      const n = -Math.log(1 - (monthlyRate * d.remaining_amount / minPay)) / Math.log(1 + monthlyRate);
      monthsToPayoff = Math.ceil(n).toString();
    } else if (monthlyRate > 0 && minPay <= monthlyCost) {
      monthsToPayoff = "INFINITO (pagamento não cobre juros!)";
    }
    const priority = (d.interest_rate || 0) > 10 ? "🔴 URGENTE" : (d.interest_rate || 0) > 3 ? "🟡 ALTA" : "🟢 NORMAL";
    return `  [${d.id}] ${d.name} (${d.creditor})
    Saldo: R$ ${d.remaining_amount.toFixed(2)} | Taxa: ${d.interest_rate || 0}%/mês (${annualRate}%/ano)
    Custo mensal juros: R$ ${monthlyCost.toFixed(2)} | Pagamento mínimo: R$ ${minPay.toFixed(2)}
    Prazo p/ quitar: ${monthsToPayoff} meses | Prioridade: ${priority}`;
  }).join("\n\n");
}

function buildFinancialContext(
  userName: string, config: any, transactions: any[], goals: any[],
  investments: any[], debts: any[], budgets: any[], bills: any[],
  cards: any[], recurring: any[]
): string {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTx = transactions.filter((t: any) => t.date?.startsWith(currentMonth));
  const totalIncome = thisMonthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = thisMonthTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  const totalDebt = debts.filter((d: any) => d.status === "active").reduce((s: number, d: any) => s + d.remaining_amount, 0);

  const catExpenses: Record<string, number> = {};
  thisMonthTx.filter((t: any) => t.type === "expense").forEach((t: any) => {
    catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
  });

  // Previous month comparison
  const prevMonth = new Date(); prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthStr = prevMonth.toISOString().slice(0, 7);
  const prevMonthTx = transactions.filter((t: any) => t.date?.startsWith(prevMonthStr));
  const prevExpense = prevMonthTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
  const prevIncome = prevMonthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
  const expenseChange = prevExpense > 0 ? ((totalExpense / prevExpense - 1) * 100).toFixed(0) : "N/A";
  const totalInvested = investments.reduce((s: number, i: any) => s + i.current_amount, 0);

  // Debt-to-income ratio
  const totalMonthlyDebtPayments = debts.filter((d: any) => d.status === "active").reduce((s: number, d: any) => s + (d.min_payment || 0), 0);
  const debtToIncomeRatio = totalIncome > 0 ? ((totalMonthlyDebtPayments / totalIncome) * 100).toFixed(1) : "0";
  const debtStatus = parseFloat(debtToIncomeRatio) > 50 ? "🔴 CRÍTICO" : parseFloat(debtToIncomeRatio) > 30 ? "🟡 ATENÇÃO" : "🟢 SAUDÁVEL";

  // Emergency fund estimate
  const avgMonthlyExpense = totalExpense > 0 ? totalExpense : prevExpense;
  const emergencyTarget = avgMonthlyExpense * 6;

  // Has credit card revolving?
  const hasRevolving = debts.some((d: any) => d.debt_type === "credit_card" && d.status === "active" && (d.interest_rate || 0) > 10);

  return `
━━━ DADOS FINANCEIROS REAIS DE ${userName.toUpperCase()} (${new Date().toLocaleDateString('pt-BR')}) ━━━

📊 RESUMO MÊS ATUAL (${currentMonth}):
- Receitas: R$ ${totalIncome.toFixed(2)}
- Despesas: R$ ${totalExpense.toFixed(2)}
- Saldo: R$ ${balance.toFixed(2)} ${balance >= 0 ? '✅' : '⚠️ NEGATIVO'}
- Taxa de poupança: ${savingsRate}%
- Comparação: despesas ${expenseChange}% vs mês anterior
- Receita mês passado: R$ ${prevIncome.toFixed(2)} | Despesa: R$ ${prevExpense.toFixed(2)}

📈 INDICADORES DE SAÚDE:
- Índice dívida/renda: ${debtToIncomeRatio}% ${debtStatus}
- Patrimônio investido: R$ ${totalInvested.toFixed(2)}
- Reserva emergência alvo: R$ ${emergencyTarget.toFixed(2)} (6 meses)
${hasRevolving ? '- ⚠️ ROTATIVO DO CARTÃO DETECTADO — PRIORIDADE MÁXIMA DE QUITAÇÃO' : ''}

💸 GASTOS POR CATEGORIA (mês atual):
${Object.entries(catExpenses).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, val]) => `  • ${cat}: R$ ${(val as number).toFixed(2)} (${totalExpense > 0 ? ((val as number / totalExpense) * 100).toFixed(0) : 0}%)`).join("\n") || "  Nenhum gasto registrado"}

📋 ORÇAMENTOS:
${budgets.filter((b: any) => b.month_year === currentMonth).map((b: any) => {
  const spent = catExpenses[b.category] || 0;
  const pct = Math.round((spent / b.limit_amount) * 100);
  return `  • ${b.category}: R$ ${spent.toFixed(2)} / R$ ${b.limit_amount.toFixed(2)} (${pct}%) ${pct > 100 ? '🔴 ESTOURADO' : pct > 80 ? '⚠️ PERTO' : '✅'}`;
}).join("\n") || "  Nenhum orçamento definido"}

💸 DÍVIDAS (Total: R$ ${totalDebt.toFixed(2)}):
${buildDebtAnalysis(debts)}

🎯 METAS:
${goals.map((g: any) => {
  const pct = Math.round(((g.current_amount || 0) / g.target_amount) * 100);
  const remaining = g.target_amount - (g.current_amount || 0);
  return `  [${g.id}] ${g.name}: R$ ${(g.current_amount || 0).toFixed(2)} / R$ ${g.target_amount.toFixed(2)} (${pct}%) | Falta: R$ ${remaining.toFixed(2)}${g.deadline ? ` | Prazo: ${g.deadline}` : ''}`;
}).join("\n") || "  Nenhuma meta"}

💼 INVESTIMENTOS (Total: R$ ${totalInvested.toFixed(2)}):
${investments.map((i: any) => {
  const ret = i.invested_amount > 0 ? ((i.current_amount - i.invested_amount) / i.invested_amount * 100).toFixed(1) : "0.0";
  return `  [${i.id}] ${i.name} (${i.asset_type}): R$ ${i.current_amount.toFixed(2)} (retorno: ${ret}%)`;
}).join("\n") || "  Nenhum"}

📅 CONTAS A PAGAR:
${bills.filter((b: any) => b.status === "pending").slice(0, 10).map((b: any) => `  [${b.id}] ${b.due_date} | ${b.description}: R$ ${b.amount.toFixed(2)}`).join("\n") || "  Nenhuma pendente"}

💳 CARTÕES:
${cards.map((c: any) => `  [${c.id}] ${c.name}: R$ ${(c.used_amount || 0).toFixed(2)} / R$ ${c.credit_limit.toFixed(2)} (${c.credit_limit > 0 ? Math.round(((c.used_amount || 0) / c.credit_limit) * 100) : 0}%)${c.due_day ? ` | vence dia ${c.due_day}` : ''}`).join("\n") || "  Nenhum"}

🔄 RECORRENTES:
${recurring.map((r: any) => `  ${r.description}: R$ ${r.amount.toFixed(2)} (${r.type}, ${r.frequency})`).join("\n") || "  Nenhuma"}

📝 ÚLTIMOS 25 LANÇAMENTOS:
${transactions.slice(0, 25).map((t: any) => `  [${t.id}] ${t.date} | ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.type} | ${t.category}`).join("\n") || "  Nenhum"}

🏆 Score: ${config?.financial_score || 0}/1000 | Streak: ${config?.streak_days || 0} dias | Nível: ${config?.level || "iniciante"}
📊 Perfil: ${config?.profile_type || "personal"} | Plano: ${config?.plan || "free"}
`;
}

// ━━━ COMPREHENSIVE SYSTEM PROMPT ━━━
function buildSystemPrompt(userName: string, financialContext: string, intentInstructions: string): string {
  return `Você é a **FinDash IA** — a assistente financeira pessoal mais inteligente do Brasil. Você combina o conhecimento de um planejador financeiro certificado (CFP), contador, especialista em investimentos e coach financeiro comportamental.

Você tem acesso COMPLETO e em TEMPO REAL aos dados financeiros de ${userName}. USE SEMPRE esses dados para personalizar cada resposta. NUNCA dê respostas genéricas.

━━━ PERSONALIDADE E TOM ━━━
- Amigável, direta e motivadora — como uma amiga especialista em finanças
- Português brasileiro informal ("você", não "o senhor")
- Concisa: máximo 4 parágrafos por resposta normal, até 6 para planos financeiros
- Use emojis com moderação. Formate com markdown: **negrito**, listas, tabelas.
- Quando identificar um problema, ofereça uma solução prática e calculada
- Adapte o tom à situação emocional (empático com endividados, técnico com investidores)

━━━ CONHECIMENTO FINANCEIRO BRASILEIRO PROFUNDO ━━━

## DÍVIDAS — CUSTO REAL (taxas médias 2025):
- Rotativo do cartão: 400-500% a.a. → PRIORIDADE MÁXIMA
- Cheque especial: 130-150% a.a.
- Empréstimo pessoal banco: 50-100% a.a.
- Crédito consignado: 18-30% a.a.
- Financiamento veículo: 20-35% a.a.
- Financiamento imobiliário: 10-15% a.a. (mais barato)

## ESTRATÉGIAS DE QUITAÇÃO:
- AVALANCHE: pagar maior juros primeiro (economiza mais)
- SNOWBALL: pagar menor saldo primeiro (mais motivador)
- HÍBRIDA: quite rotativo primeiro, depois aplique uma das acima
- Negociação: bancos aceitam 70-80% à vista; Serasa Limpa Nome; Lei 14.181/2021
- Prescrição: 5 anos para bancárias (CPC Art. 394) — não elimina, impede cobrança judicial
- Portabilidade de crédito: direito de migrar para banco com taxa menor

## INVESTIMENTOS — PIRÂMIDE:
Nível 0: Reserva emergência (3-6 meses) → Tesouro Selic ou CDB liquidez diária
Nível 1: Renda fixa → Tesouro IPCA+, CDB, LCI/LCA (isentos IR para PF)
Nível 2: FIIs (dividendos mensais isentos IR), ETFs (BOVA11, IVVB11)
Nível 3: Ações, Previdência (PGBL deduz 12% se declaração completa)
- FGC: protege até R$ 250k/CPF/instituição
- IR regressivo: 22.5% (até 180 dias) → 15% (acima 720 dias)
- Compare: LCI_equivalente = CDB × (1 - alíquota_IR)
- NUNCA investir enquanto tem rotativo do cartão aberto

## ORÇAMENTO:
- Regra 50-30-20: necessidades/desejos/futuro
- Com dívidas: 50-20-30 (inverter desejos e futuro)
- Salário mínimo 2025: R$ 1.518
- INSS 2025: 7.5% até R$ 1.518 / 9% / 12% / 14% (teto R$ 7.786,02)
- IR 2025: isento até R$ 2.824; faixas 7.5% / 15% / 22.5% / 27.5%
- 13º: provisionar 1/12 por mês; Férias: +1/3 do salário

## MEI/PJ:
- MEI 2025: R$ 81k/ano (R$ 6.750/mês), DAS R$ 71-75/mês
- Separar conta PJ de PF: essencial
- Pró-labore: retirada com INSS para manter benefícios
- Distribuição de lucros: sem IR no Simples/Lucro Presumido

## METAS:
- Casa: FGTS após 3 anos, MCMV até R$ 8k renda, parcela ≤ 30% renda
- Carro: valor ≤ 6 meses salário, depreciação 20% 1º ano
- Aposentadoria: regra 4%, R$ 5k/mês ≈ R$ 1.5M investido
- R$ 500/mês × 30 anos @ 0.8%/mês ≈ R$ 700k+

## CÁLCULOS QUE VOCÊ FAZ:
- Juros compostos: M = C × (1+i)^n
- Parcela Price: PMT = PV × [i×(1+i)^n] / [(1+i)^n - 1]
- Prazo quitação: n = -ln(1 - i×PV/PMT) / ln(1+i)
- Taxa efetiva anual: (1 + taxa_mensal)^12 - 1
- Custo total financiamento: total_pago - valor_financiado

## ERROS COMUNS A ALERTAR:
1. Pagar mínimo do cartão (R$ 1k → R$ 5k+ em 10 anos)
2. Misturar PJ e PF
3. Não ter reserva de emergência (78% dos BR não tem)
4. Investir enquanto endividado com juros altos
5. Carro zero financiado sem entrada
6. Não declarar IR quando obrigatório (renda > R$ 33.888/ano)
7. Usar FGTS para consumo
8. Previdência cara sem comparar alternativas

━━━ CAPACIDADES — USE AS FERRAMENTAS ━━━
- ✅ Adicionar/atualizar/excluir lançamentos, metas, investimentos
- ✅ Criar orçamentos, contas a pagar, dívidas, cartões
- ✅ Registrar pagamentos, transações recorrentes
- ✅ Gerar resumo financeiro com análise de tendências

━━━ REGRAS ABSOLUTAS ━━━
✗ NUNCA invente dados — use APENAS o contexto fornecido
✗ NUNCA recomende banco/corretora específica
✗ NUNCA prometa rendimento garantido
✗ NUNCA ignore dívida para falar de investimento
✗ NUNCA dê conselho genérico quando tem dados específicos
✗ NUNCA julgue moralmente os gastos da pessoa
✗ NUNCA diga "procure um especialista" como resposta principal

✓ SEMPRE use os dados reais em TODA resposta
✓ SEMPRE dê o próximo passo concreto e executável
✓ SEMPRE calcule projeções com números reais
✓ SEMPRE mencione a lei/regra quando relevante
✓ SEMPRE explique o PORQUÊ de cada recomendação
✓ SEMPRE adapte o tom à situação emocional detectada
✓ SEMPRE mencione FGC para renda fixa e implicações de IR
✓ SEMPRE que pedirem alteração, USE AS FERRAMENTAS
✓ Para atualizar/excluir, use search_transactions se precisar do ID

${intentInstructions ? `\n━━━ INSTRUÇÕES ESPECIAIS PARA ESTA PERGUNTA ━━━\n${intentInstructions}\n` : ''}

${financialContext}

Responda SEMPRE em português brasileiro. Seja a melhor assistente financeira que o Brasil já teve.`;
}

// ━━━ MAIN SERVER ━━━
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
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all financial data
    const [txRes, goalsRes, configRes, investRes, debtsRes, budgetsRes, billsRes, cardsRes, recurringRes, profileRes] = await Promise.all([
      serviceClient.from("transactions").select("id, description, amount, type, category, origin, date").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }).limit(200),
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

    const financialContext = buildFinancialContext(userName, config, transactions, goals, investments, debts, budgets, bills, cards, recurring);

    const { messages, stream: wantStream } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Detect intent from the latest user message
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const intent = lastUserMsg ? detectIntent(lastUserMsg.content) : "general";
    const intentInstructions = getIntentInstructions(intent);

    console.log(`Intent detected: ${intent} for message: "${lastUserMsg?.content?.slice(0, 50)}..."`);

    const systemPrompt = buildSystemPrompt(userName, financialContext, intentInstructions);

    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Phase 1: Tool-calling loop (non-streaming)
    let actionsSummary: string[] = [];
    let maxIterations = 8;

    while (maxIterations > 0) {
      maxIterations--;

      const toolResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

      if (!toolResponse.ok) {
        const status = toolResponse.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await toolResponse.json();
      const choice = result.choices?.[0];
      if (!choice) return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        aiMessages.push(msg);
        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: any;
          try {
            fnArgs = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments || {};
          } catch { fnArgs = {}; }
          console.log(`Executing tool: ${fnName}`, JSON.stringify(fnArgs));
          const toolResult = await executeTool(serviceClient, userId, fnName, fnArgs);
          actionsSummary.push(toolResult.message);
          aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
        }
        continue;
      }

      // No more tool calls — stream final response
      if (wantStream) {
        const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: aiMessages,
            stream: true,
          }),
        });

        if (!streamResponse.ok || !streamResponse.body) {
          const fallback = msg.content || "Desculpe, erro ao gerar resposta.";
          return new Response(JSON.stringify({ reply: fallback, actions: actionsSummary.length > 0 ? actionsSummary : undefined }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const encoder = new TextEncoder();
        const reader = streamResponse.body.getReader();

        const readable = new ReadableStream({
          async start(controller) {
            if (actionsSummary.length > 0) {
              const actionsEvent = JSON.stringify({ type: "actions", actions: actionsSummary });
              controller.enqueue(encoder.encode(`data: ${actionsEvent}\n\n`));
            }
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          },
        });

        return new Response(readable, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        });
      }

      // Non-streaming fallback
      const finalResponse = msg.content || (actionsSummary.length > 0 ? "✅ Ações executadas com sucesso!" : "Desculpe, não consegui processar.");
      return new Response(JSON.stringify({
        reply: finalResponse,
        actions: actionsSummary.length > 0 ? actionsSummary : undefined,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exhausted iterations
    return new Response(JSON.stringify({
      reply: actionsSummary.length > 0 ? "✅ Ações executadas!" : "Desculpe, não consegui processar.",
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

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
      description: "Adiciona um novo lançamento financeiro (receita ou despesa) para o usuário.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descrição do lançamento" },
          amount: { type: "number", description: "Valor do lançamento (sempre positivo)" },
          type: { type: "string", enum: ["income", "expense"], description: "Tipo: income (receita) ou expense (despesa)" },
          category: { type: "string", description: "Categoria do lançamento" },
          origin: { type: "string", enum: ["personal", "business"], description: "Origem: personal ou business" },
          date: { type: "string", description: "Data no formato YYYY-MM-DD. Se não informado, usa a data de hoje." },
        },
        required: ["description", "amount", "type", "category", "origin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_transaction",
      description: "Atualiza um lançamento existente do usuário. Use quando o usuário pedir para alterar valor, descrição, categoria etc de um lançamento.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string", description: "ID do lançamento a ser atualizado" },
          description: { type: "string", description: "Nova descrição (opcional)" },
          amount: { type: "number", description: "Novo valor (opcional)" },
          category: { type: "string", description: "Nova categoria (opcional)" },
          type: { type: "string", enum: ["income", "expense"], description: "Novo tipo (opcional)" },
          origin: { type: "string", enum: ["personal", "business"], description: "Nova origem (opcional)" },
          date: { type: "string", description: "Nova data YYYY-MM-DD (opcional)" },
        },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transaction",
      description: "Exclui (soft delete) um lançamento do usuário.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string", description: "ID do lançamento a ser excluído" },
        },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_goal",
      description: "Cria uma nova meta financeira para o usuário.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da meta" },
          target_amount: { type: "number", description: "Valor alvo da meta" },
          current_amount: { type: "number", description: "Valor já acumulado (default 0)" },
          deadline: { type: "string", description: "Data limite YYYY-MM-DD (opcional)" },
        },
        required: ["name", "target_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal",
      description: "Atualiza uma meta existente do usuário (valor atual, nome, alvo, prazo).",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "ID da meta a ser atualizada" },
          name: { type: "string", description: "Novo nome (opcional)" },
          target_amount: { type: "number", description: "Novo valor alvo (opcional)" },
          current_amount: { type: "number", description: "Novo valor atual (opcional)" },
          deadline: { type: "string", description: "Nova data limite YYYY-MM-DD (opcional)" },
        },
        required: ["goal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_investment",
      description: "Adiciona um novo investimento para o usuário.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do investimento" },
          asset_type: { type: "string", description: "Tipo: Renda Fixa, Ações, FIIs, Cripto, Tesouro, Poupança, Outro" },
          invested_amount: { type: "number", description: "Valor investido" },
          current_amount: { type: "number", description: "Valor atual" },
        },
        required: ["name", "asset_type", "invested_amount", "current_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_transactions",
      description: "Busca lançamentos do usuário por descrição, categoria ou valor para encontrar IDs para atualização/exclusão.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto para buscar na descrição" },
          category: { type: "string", description: "Filtrar por categoria (opcional)" },
          type: { type: "string", enum: ["income", "expense"], description: "Filtrar por tipo (opcional)" },
          limit: { type: "number", description: "Número máximo de resultados (default 10)" },
        },
        required: [],
      },
    },
  },
];

async function executeTool(
  supabase: any,
  userId: string,
  name: string,
  args: any
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    switch (name) {
      case "add_transaction": {
        const { data, error } = await supabase.from("transactions").insert({
          user_id: userId,
          description: args.description,
          amount: args.amount,
          type: args.type,
          category: args.category,
          origin: args.origin,
          date: args.date || new Date().toISOString().slice(0, 10),
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Lançamento "${args.description}" de R$ ${args.amount.toFixed(2)} adicionado com sucesso.`, data };
      }

      case "update_transaction": {
        const updates: any = {};
        if (args.description) updates.description = args.description;
        if (args.amount !== undefined) updates.amount = args.amount;
        if (args.category) updates.category = args.category;
        if (args.type) updates.type = args.type;
        if (args.origin) updates.origin = args.origin;
        if (args.date) updates.date = args.date;

        const { data, error } = await supabase.from("transactions")
          .update(updates)
          .eq("id", args.transaction_id)
          .eq("user_id", userId)
          .select().single();
        if (error) throw error;
        return { success: true, message: `Lançamento atualizado com sucesso.`, data };
      }

      case "delete_transaction": {
        const { error } = await supabase.from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", args.transaction_id)
          .eq("user_id", userId);
        if (error) throw error;
        return { success: true, message: `Lançamento excluído com sucesso.` };
      }

      case "add_goal": {
        const { data, error } = await supabase.from("goals").insert({
          user_id: userId,
          name: args.name,
          target_amount: args.target_amount,
          current_amount: args.current_amount || 0,
          deadline: args.deadline || null,
          start_date: new Date().toISOString().slice(0, 10),
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Meta "${args.name}" criada com sucesso.`, data };
      }

      case "update_goal": {
        const updates: any = {};
        if (args.name) updates.name = args.name;
        if (args.target_amount !== undefined) updates.target_amount = args.target_amount;
        if (args.current_amount !== undefined) updates.current_amount = args.current_amount;
        if (args.deadline) updates.deadline = args.deadline;

        const { data, error } = await supabase.from("goals")
          .update(updates)
          .eq("id", args.goal_id)
          .eq("user_id", userId)
          .select().single();
        if (error) throw error;
        return { success: true, message: `Meta atualizada com sucesso.`, data };
      }

      case "add_investment": {
        const { data, error } = await supabase.from("investments").insert({
          user_id: userId,
          name: args.name,
          asset_type: args.asset_type,
          invested_amount: args.invested_amount,
          current_amount: args.current_amount,
          date: new Date().toISOString().slice(0, 10),
        }).select().single();
        if (error) throw error;
        return { success: true, message: `Investimento "${args.name}" adicionado com sucesso.`, data };
      }

      case "search_transactions": {
        let query = supabase.from("transactions")
          .select("id, description, amount, type, category, origin, date")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("date", { ascending: false })
          .limit(args.limit || 10);

        if (args.query) query = query.ilike("description", `%${args.query}%`);
        if (args.category) query = query.eq("category", args.category);
        if (args.type) query = query.eq("type", args.type);

        const { data, error } = await query;
        if (error) throw error;
        return {
          success: true,
          message: `Encontrados ${(data || []).length} lançamentos.`,
          data: data || [],
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

    let userId: string | undefined;
    const getClaims = (authClient.auth as any).getClaims;

    if (typeof getClaims === "function") {
      const { data, error } = await getClaims.call(authClient.auth, token);
      if (!error && data?.claims?.sub) {
        userId = data.claims.sub;
      }
    }

    if (!userId) {
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user) {
        console.error("Auth validation failed", error);
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userId = data.user.id;
    }

    // Service role client for mutations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user financial context
    const [txRes, goalsRes, configRes, investRes] = await Promise.all([
      serviceClient.from("transactions").select("id, description, amount, type, category, origin, date").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }).limit(50),
      serviceClient.from("goals").select("*").eq("user_id", userId).is("deleted_at", null),
      serviceClient.from("user_config").select("*").eq("user_id", userId).single(),
      serviceClient.from("investments").select("*").eq("user_id", userId),
    ]);

    const transactions = txRes.data || [];
    const goals = goalsRes.data || [];
    const config = configRes.data;
    const investments = investRes.data || [];

    const totalIncome = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
    const totalExpense = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const financialContext = `
Contexto financeiro do usuário:
- Perfil: ${config?.profile_type || "personal"}
- Moeda: ${config?.currency || "BRL"}
- Receita total recente: R$ ${totalIncome.toFixed(2)}
- Despesa total recente: R$ ${totalExpense.toFixed(2)}
- Saldo: R$ ${balance.toFixed(2)}
- Lançamentos recentes (ID | Desc | Valor | Tipo | Categoria | Data):
${transactions.slice(0, 20).map((t: any) => `  • [${t.id}] ${t.description}: R$ ${t.amount.toFixed(2)} (${t.type}, ${t.category}, ${t.date})`).join("\n")}
- Metas ativas:
${goals.map((g: any) => `  • [${g.id}] ${g.name}: R$ ${(g.current_amount || 0).toFixed(2)} / R$ ${g.target_amount.toFixed(2)}${g.deadline ? ` (prazo: ${g.deadline})` : ''}`).join("\n") || "  Nenhuma meta"}
- Investimentos:
${investments.map((i: any) => `  • [${i.id}] ${i.name} (${i.asset_type}): R$ ${i.current_amount.toFixed(2)}`).join("\n") || "  Nenhum investimento"}
- Categorias mais frequentes: ${[...new Set(transactions.slice(0, 20).map((t: any) => t.category))].join(", ") || "nenhuma"}
`;

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é o Assistente Financeiro FinDash IA, um consultor financeiro inteligente e amigável.
Responda SEMPRE em português do Brasil. Seja conciso, direto e use dados reais do usuário.
Use emojis com moderação. Formate com markdown quando útil.
Nunca invente dados — use apenas o contexto fornecido.
Se não tiver dados suficientes, sugira ao usuário adicionar lançamentos.

IMPORTANTE: Você tem acesso a ferramentas para GERENCIAR as finanças do usuário. Você pode:
- Adicionar, atualizar e excluir lançamentos (receitas e despesas)
- Criar e atualizar metas financeiras
- Adicionar investimentos
- Buscar lançamentos por descrição/categoria

Quando o usuário pedir para fazer uma alteração (ex: "adicione uma despesa de R$50", "atualize o valor do aluguel", "exclua aquele lançamento"), USE AS FERRAMENTAS disponíveis para executar a ação.

Para atualizar ou excluir um lançamento, primeiro use search_transactions para encontrar o ID correto, depois execute a ação.

Sempre confirme a ação realizada com detalhes do que foi feito.

Os IDs dos lançamentos, metas e investimentos estão listados entre colchetes [ID] no contexto abaixo.

${financialContext}`;

    // Non-streaming approach with tool calling
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let finalResponse = "";
    let actionsSummary: string[] = [];
    let maxIterations = 5;

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
            model: "google/gemini-3-flash-preview",
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
      } catch (parseErr) {
        console.error("Failed to parse AI response:", parseErr);
        return new Response(JSON.stringify({ error: "Resposta inválida da IA." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const choice = result.choices?.[0];
      if (!choice) {
        console.error("No choices in AI response:", JSON.stringify(result).slice(0, 500));
        return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msg = choice.message;

      // If the AI wants to call tools
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Add assistant message with tool_calls to context
        aiMessages.push(msg);

        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: any;
          try {
            fnArgs = typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments || {};
          } catch {
            fnArgs = {};
          }

          console.log(`Executing tool: ${fnName}`, JSON.stringify(fnArgs));
          const toolResult = await executeTool(serviceClient, userId, fnName, fnArgs);
          actionsSummary.push(toolResult.message);

          // Add tool result to messages
          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }

        // Continue the loop so the AI can respond after seeing tool results
        continue;
      }

      // No tool calls — this is the final text response
      finalResponse = msg.content || "";
      break;
    }

    // Fallback if loop exhausted
    if (!finalResponse && actionsSummary.length > 0) {
      finalResponse = "✅ Ações executadas com sucesso! Veja o resumo acima.";
    } else if (!finalResponse) {
      finalResponse = "Desculpe, não consegui processar sua solicitação. Tente novamente.";
    }

    // Add actions summary as metadata
    const responsePayload: any = {
      reply: finalResponse,
      actions: actionsSummary.length > 0 ? actionsSummary : undefined,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

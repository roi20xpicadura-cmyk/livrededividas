import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check cache (30 min)
    const { data: cache } = await serviceClient
      .from("ai_insights_cache")
      .select("insights, generated_at")
      .eq("user_id", userId)
      .single();

    if (cache?.generated_at) {
      const age = Date.now() - new Date(cache.generated_at).getTime();
      if (age < 30 * 60 * 1000) {
        return new Response(JSON.stringify(cache.insights), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch financial data
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [txRes, goalsRes, configRes, debtsRes, budgetsRes, billsRes, profileRes] = await Promise.all([
      serviceClient.from("transactions").select("amount, type, category, date").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }).limit(200),
      serviceClient.from("goals").select("name, target_amount, current_amount, deadline").eq("user_id", userId).is("deleted_at", null),
      serviceClient.from("user_config").select("financial_score, streak_days, level").eq("user_id", userId).single(),
      serviceClient.from("debts").select("name, remaining_amount, interest_rate, status").eq("user_id", userId).eq("status", "active"),
      serviceClient.from("budgets").select("category, limit_amount, month_year").eq("user_id", userId).eq("month_year", currentMonth),
      serviceClient.from("scheduled_bills").select("description, amount, due_date, status").eq("user_id", userId).eq("status", "pending").order("due_date", { ascending: true }).limit(5),
      serviceClient.from("profiles").select("full_name").eq("id", userId).single(),
    ]);

    const txs = txRes.data || [];
    const thisMonthTx = txs.filter((t: any) => t.date?.startsWith(currentMonth));
    const income = thisMonthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
    const expense = thisMonthTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    const catExpenses: Record<string, number> = {};
    thisMonthTx.filter((t: any) => t.type === "expense").forEach((t: any) => {
      catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
    });

    const topCategory = Object.entries(catExpenses).sort((a, b) => b[1] - a[1])[0];
    const totalDebt = (debtsRes.data || []).reduce((s: number, d: any) => s + d.remaining_amount, 0);
    const highInterestDebt = (debtsRes.data || []).find((d: any) => d.interest_rate > 3);
    const goals = goalsRes.data || [];
    const budgets = budgetsRes.data || [];
    const bills = billsRes.data || [];
    const config = configRes.data;
    const userName = profileRes.data?.full_name?.split(' ')[0] || '';

    // Build budget alerts
    const overBudget = budgets.filter((b: any) => {
      const spent = catExpenses[b.category] || 0;
      return spent > b.limit_amount;
    });
    const nearBudget = budgets.filter((b: any) => {
      const spent = catExpenses[b.category] || 0;
      const pct = spent / b.limit_amount;
      return pct >= 0.8 && pct <= 1;
    });

    // Upcoming bills (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const urgentBills = bills.filter((b: any) => new Date(b.due_date) <= threeDaysFromNow);

    // Close goals
    const closeGoals = goals.filter((g: any) => {
      const pct = (g.current_amount || 0) / g.target_amount;
      return pct >= 0.8 && pct < 1;
    });

    const dataContext = `
Nome: ${userName}
Receita: R$ ${income.toFixed(2)}, Despesa: R$ ${expense.toFixed(2)}, Saldo: R$ ${balance.toFixed(2)}
Taxa poupança: ${savingsRate}%
Maior gasto: ${topCategory ? `${topCategory[0]}: R$ ${topCategory[1].toFixed(2)}` : 'N/A'}
Dívida total: R$ ${totalDebt.toFixed(2)}
${highInterestDebt ? `Dívida com juros altos: ${highInterestDebt.name} (${highInterestDebt.interest_rate}%/mês)` : ''}
Orçamentos estourados: ${overBudget.map((b: any) => `${b.category} (R$ ${(catExpenses[b.category] || 0).toFixed(2)} / R$ ${b.limit_amount.toFixed(2)})`).join(', ') || 'nenhum'}
Orçamentos quase no limite: ${nearBudget.map((b: any) => b.category).join(', ') || 'nenhum'}
Contas urgentes (3 dias): ${urgentBills.map((b: any) => `${b.description} R$ ${b.amount.toFixed(2)} em ${b.due_date}`).join(', ') || 'nenhuma'}
Metas perto de concluir: ${closeGoals.map((g: any) => `${g.name} (${Math.round(((g.current_amount || 0) / g.target_amount) * 100)}%)`).join(', ') || 'nenhuma'}
Score: ${config?.financial_score || 0}/1000, Streak: ${config?.streak_days || 0} dias
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const insightsTools = [{
      type: "function",
      function: {
        name: "return_insights",
        description: "Retorna os insights financeiros personalizados.",
        parameters: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["warning", "success", "info", "danger"] },
                  icon: { type: "string", description: "Um emoji" },
                  title: { type: "string", description: "Título curto (max 6 palavras)" },
                  message: { type: "string", description: "Mensagem específica com valores reais (max 2 frases)" },
                  action_label: { type: "string", description: "Texto do botão de ação (opcional)" },
                  action_path: { type: "string", description: "/app/rota (opcional)" },
                },
                required: ["type", "icon", "title", "message"],
              },
            },
          },
          required: ["insights"],
        },
      },
    }];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista financeiro. Gere exatamente 4 insights personalizados e específicos usando os dados reais do usuário. Seja ESPECÍFICO — use valores reais. Nada genérico. Responda em português brasileiro." },
          { role: "user", content: `Gere 4 insights financeiros proativos para este usuário:\n${dataContext}\n\nPriorize: 1) Alertas urgentes (contas, orçamentos estourados) 2) Oportunidades (economia, metas) 3) Celebrações (conquistas, streaks) 4) Dicas personalizadas` },
        ],
        tools: insightsTools,
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI insights error:", aiResponse.status);
      // Return default insights
      const defaults = [
        { type: "info", icon: "📊", title: "Resumo do mês", message: `Receita: R$ ${income.toFixed(2)} | Despesa: R$ ${expense.toFixed(2)} | Saldo: R$ ${balance.toFixed(2)}` },
        { type: balance >= 0 ? "success" : "danger", icon: balance >= 0 ? "✅" : "⚠️", title: balance >= 0 ? "Saldo positivo" : "Atenção ao saldo", message: balance >= 0 ? `Você está economizando ${savingsRate}% da receita.` : "Seus gastos estão acima da receita este mês." },
      ];
      return new Response(JSON.stringify(defaults), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let insights: any[];

    if (toolCall) {
      try {
        const args = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
        insights = args.insights || [];
      } catch {
        insights = [{ type: "info", icon: "📊", title: "Dados carregados", message: `Saldo do mês: R$ ${balance.toFixed(2)}` }];
      }
    } else {
      insights = [{ type: "info", icon: "📊", title: "Dados carregados", message: `Saldo do mês: R$ ${balance.toFixed(2)}` }];
    }

    // Cache
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await serviceClient.from("ai_insights_cache").upsert({
      user_id: userId,
      insights: insights,
      generated_at: now,
      expires_at: expiresAt,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

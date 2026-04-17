import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ━━━ AGENT TYPES ━━━
interface AgentAlert {
  user_id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  triggered_date: string;
}

// ━━━ MAIN HANDLER ━━━
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Can be called by cron (no auth) or by user (with auth)
    let targetUserId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Check if it's anon key (user call) or service role (cron)
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          anonKey,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await userClient.auth.getUser();
        if (user) targetUserId = user.id;
      }
    }

    // Get body if present
    try {
      const body = await req.json();
      if (body?.userId) targetUserId = body.userId;
    } catch { /* no body */ }

    // Get users to process
    let userIds: string[] = [];
    if (targetUserId) {
      userIds = [targetUserId];
    } else {
      // Cron: process all active users (last activity within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: configs } = await supabase
        .from("user_config")
        .select("user_id")
        .gte("last_activity_date", thirtyDaysAgo.toISOString().split("T")[0]);
      userIds = configs?.map((c) => c.user_id) || [];
    }

    console.log(`🤖 Financial Agents: processing ${userIds.length} users`);

    const allAlerts: AgentAlert[] = [];

    for (const userId of userIds) {
      const alerts = await runAgents(userId);
      allAlerts.push(...alerts);
    }

    // Save new alerts (upsert to avoid duplicates)
    if (allAlerts.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const newlyCreatedAlerts: AgentAlert[] = [];

      for (const alert of allAlerts) {
        // Check if same alert already exists today
        const { data: existing } = await supabase
          .from("prediction_alerts")
          .select("id")
          .eq("user_id", alert.user_id)
          .eq("alert_type", alert.alert_type)
          .eq("triggered_date", today)
          .maybeSingle();

        if (!existing) {
          await supabase.from("prediction_alerts").insert({
            ...alert,
            triggered_date: today,
          });
          newlyCreatedAlerts.push(alert);
        }
      }

      // Send WhatsApp ONLY for newly-created critical/warning alerts (avoid spam)
      for (const alert of newlyCreatedAlerts.filter((a) => a.severity !== "info")) {
        await sendWhatsAppAlert(alert);
      }
    }

    // If single user, return their alerts
    if (targetUserId) {
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentAlerts } = await supabase
        .from("prediction_alerts")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("triggered_date", sevenDaysAgo.toISOString().split("T")[0])
        .eq("dismissed", false)
        .order("triggered_date", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({ alerts: recentAlerts || [], generated: allAlerts.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ processed: userIds.length, alerts: allAlerts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Financial agents error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ━━━ RUN ALL AGENTS ━━━
async function runAgents(userId: string): Promise<AgentAlert[]> {
  const alerts: AgentAlert[] = [];
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split("T")[0];

  // Load user data in parallel
  const [
    { data: txs },
    { data: budgets },
    { data: bills },
    { data: cards },
    { data: debts },
    { data: goals },
    { data: config },
    { data: lastMonthTxs },
  ] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", userId)
      .gte("date", firstDay).is("deleted_at", null),
    supabase.from("budgets").select("*").eq("user_id", userId)
      .eq("month_year", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`),
    supabase.from("scheduled_bills").select("*").eq("user_id", userId)
      .eq("status", "pending"),
    supabase.from("credit_cards").select("*").eq("user_id", userId),
    supabase.from("debts").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("goals").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("user_config").select("*").eq("user_id", userId).single(),
    supabase.from("transactions").select("*").eq("user_id", userId)
      .gte("date", new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0])
      .lt("date", firstDay).is("deleted_at", null),
  ]);

  const expenses = txs?.filter((t) => t.type === "expense") || [];
  const income = txs?.filter((t) => t.type === "income") || [];
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);

  // ━━━ AGENT 1: MARIE — Budget Monitor ━━━
  if (budgets && budgets.length > 0) {
    const catSpend: Record<string, number> = {};
    expenses.forEach((t) => {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
    });

    for (const budget of budgets) {
      const spent = catSpend[budget.category] || 0;
      const pct = (spent / budget.limit_amount) * 100;

      if (pct >= 100) {
        alerts.push({
          user_id: userId,
          alert_type: "budget_exceeded",
          severity: "critical",
          title: `🚨 Orçamento de ${budget.category} estourado!`,
          description: `Você gastou R$ ${spent.toFixed(0)} de R$ ${budget.limit_amount} (${pct.toFixed(0)}%). Marie sugere pausar gastos nessa categoria.`,
          triggered_date: today.toISOString().split("T")[0],
        });
      } else if (pct >= 80) {
        alerts.push({
          user_id: userId,
          alert_type: "budget_warning",
          severity: "warning",
          title: `⚠️ ${budget.category}: ${pct.toFixed(0)}% do orçamento`,
          description: `Restam R$ ${(budget.limit_amount - spent).toFixed(0)} nessa categoria. Marie recomenda atenção.`,
          triggered_date: today.toISOString().split("T")[0],
        });
      }
    }
  }

  // ━━━ AGENT 2: EINSTEIN — Spending Pattern Detector ━━━
  const lastMonthExpenses = lastMonthTxs?.filter((t) => t.type === "expense") || [];
  const lastMonthTotal = lastMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedExpense = (totalExpense / Math.max(dayOfMonth, 1)) * daysInMonth;

  if (lastMonthTotal > 0 && projectedExpense > lastMonthTotal * 1.2) {
    const increase = ((projectedExpense / lastMonthTotal) - 1) * 100;
    alerts.push({
      user_id: userId,
      alert_type: "spending_anomaly",
      severity: "warning",
      title: `📊 Gastos ${increase.toFixed(0)}% acima do mês passado`,
      description: `Einstein projeta R$ ${projectedExpense.toFixed(0)} este mês vs R$ ${lastMonthTotal.toFixed(0)} no anterior. Reduza em ${Math.ceil((projectedExpense - lastMonthTotal) / (daysInMonth - dayOfMonth))} /dia para equilibrar.`,
      triggered_date: today.toISOString().split("T")[0],
    });
  }

  // Detect category spikes
  const lastCatSpend: Record<string, number> = {};
  lastMonthExpenses.forEach((t) => {
    lastCatSpend[t.category] = (lastCatSpend[t.category] || 0) + t.amount;
  });
  const currCatSpend: Record<string, number> = {};
  expenses.forEach((t) => {
    currCatSpend[t.category] = (currCatSpend[t.category] || 0) + t.amount;
  });

  for (const [cat, currAmt] of Object.entries(currCatSpend)) {
    const lastAmt = lastCatSpend[cat] || 0;
    if (lastAmt > 50 && currAmt > lastAmt * 1.5 && currAmt > 100) {
      alerts.push({
        user_id: userId,
        alert_type: "category_spike",
        severity: "info",
        title: `📈 ${cat} subiu ${(((currAmt / lastAmt) - 1) * 100).toFixed(0)}%`,
        description: `Você já gastou R$ ${currAmt.toFixed(0)} em ${cat} (vs R$ ${lastAmt.toFixed(0)} mês passado inteiro).`,
        triggered_date: today.toISOString().split("T")[0],
      });
    }
  }

  // ━━━ AGENT 3: GALILEU — Cash Flow Predictor ━━━
  if (totalIncome > 0) {
    const burnRate = totalExpense / Math.max(dayOfMonth, 1);
    const remainingDays = daysInMonth - dayOfMonth;
    const projectedEnd = totalIncome - totalExpense - (burnRate * remainingDays);

    if (projectedEnd < 0) {
      const negativeDay = Math.floor(
        (totalIncome - totalExpense) / burnRate
      ) + dayOfMonth;
      alerts.push({
        user_id: userId,
        alert_type: "cashflow_negative",
        severity: "critical",
        title: `🔴 Projeção negativa dia ${Math.min(negativeDay, daysInMonth)}`,
        description: `Galileu prevê saldo de R$ ${projectedEnd.toFixed(0)} no final do mês. Reduza R$ ${(burnRate * 0.2).toFixed(0)}/dia para fechar positivo.`,
        triggered_date: today.toISOString().split("T")[0],
      });
    } else if (projectedEnd < totalIncome * 0.1) {
      alerts.push({
        user_id: userId,
        alert_type: "cashflow_tight",
        severity: "warning",
        title: `🟡 Mês apertado: sobram R$ ${projectedEnd.toFixed(0)}`,
        description: `Galileu projeta margem de apenas ${((projectedEnd / totalIncome) * 100).toFixed(0)}% no final do mês.`,
        triggered_date: today.toISOString().split("T")[0],
      });
    }
  }

  // ━━━ AGENT 4: Bills Due Soon ━━━
  if (bills && bills.length > 0) {
    for (const bill of bills) {
      const dueDate = new Date(bill.due_date);
      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil >= 0 && daysUntil <= 3) {
        alerts.push({
          user_id: userId,
          alert_type: "bill_due_soon",
          severity: daysUntil === 0 ? "critical" : "warning",
          title: daysUntil === 0
            ? `🚨 ${bill.description} vence HOJE!`
            : `📅 ${bill.description} vence em ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`,
          description: `Valor: R$ ${bill.amount.toFixed(2)}. ${bill.category}.`,
          triggered_date: today.toISOString().split("T")[0],
        });
      }
    }
  }

  // ━━━ AGENT 5: Card Limit Alert ━━━
  if (cards && cards.length > 0) {
    for (const card of cards) {
      const used = card.used_amount || 0;
      const limit = card.credit_limit;
      const utilization = (used / limit) * 100;

      if (utilization >= 80) {
        alerts.push({
          user_id: userId,
          alert_type: "card_limit",
          severity: utilization >= 95 ? "critical" : "warning",
          title: `💳 ${card.name}: ${utilization.toFixed(0)}% do limite`,
          description: `Usado R$ ${used.toFixed(0)} de R$ ${limit.toFixed(0)}. Limite disponível: R$ ${(limit - used).toFixed(0)}.`,
          triggered_date: today.toISOString().split("T")[0],
        });
      }
    }
  }

  // ━━━ AGENT 6: Goal Progress ━━━
  if (goals && goals.length > 0) {
    for (const goal of goals) {
      const current = goal.current_amount || 0;
      const target = goal.target_amount;
      const pct = (current / target) * 100;

      if (goal.deadline) {
        const deadline = new Date(goal.deadline);
        const daysLeft = Math.ceil(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const remaining = target - current;
        const dailyNeeded = remaining / Math.max(daysLeft, 1);

        if (daysLeft > 0 && daysLeft <= 30 && pct < 80) {
          alerts.push({
            user_id: userId,
            alert_type: "goal_deadline",
            severity: "warning",
            title: `🎯 ${goal.name}: ${daysLeft} dias restantes`,
            description: `Faltam R$ ${remaining.toFixed(0)} (${pct.toFixed(0)}% concluído). Guarde R$ ${dailyNeeded.toFixed(0)}/dia para atingir.`,
            triggered_date: today.toISOString().split("T")[0],
          });
        }
      }

      if (pct >= 90 && pct < 100) {
        alerts.push({
          user_id: userId,
          alert_type: "goal_almost",
          severity: "info",
          title: `🏆 ${goal.name}: ${pct.toFixed(0)}% — quase lá!`,
          description: `Faltam apenas R$ ${(target - current).toFixed(0)} para completar sua meta!`,
          triggered_date: today.toISOString().split("T")[0],
        });
      }
    }
  }

  // ━━━ AGENT 7: Savings Rate ━━━
  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
    if (savingsRate < 10 && dayOfMonth >= 15) {
      alerts.push({
        user_id: userId,
        alert_type: "savings_low",
        severity: "warning",
        title: `💸 Taxa de poupança: ${savingsRate.toFixed(0)}%`,
        description: `Ideal é poupar ao menos 20% da renda. Você está guardando R$ ${(totalIncome - totalExpense).toFixed(0)} de R$ ${totalIncome.toFixed(0)}.`,
        triggered_date: today.toISOString().split("T")[0],
      });
    }
  }

  return alerts;
}

// ━━━ SEND WHATSAPP ALERT ━━━
async function sendWhatsAppAlert(alert: AgentAlert) {
  try {
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("phone_number, active, verified")
      .eq("user_id", alert.user_id)
      .eq("verified", true)
      .eq("active", true)
      .maybeSingle();

    if (!connection) return;

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", alert.user_id)
      .maybeSingle();

    if (prefs) {
      if (alert.alert_type.startsWith("budget") && !prefs.budget_alerts) return;
      if (alert.alert_type === "card_limit" && !prefs.card_due_alerts) return;
      if (alert.alert_type.startsWith("goal") && !prefs.goal_alerts) return;
      if (alert.alert_type.startsWith("debt") && !prefs.debt_reminders) return;
    }

    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) return;

    const message = `${alert.title}\n\n${alert.description}\n\n— KoraFinance IA 🤖`;

    await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({
          phone: connection.phone_number,
          message,
        }),
      }
    );

    // Log outbound message
    await supabase.from("whatsapp_messages").insert({
      user_id: alert.user_id,
      phone_number: connection.phone_number,
      direction: "outbound",
      message,
      intent: "agent_alert",
    });
  } catch (err) {
    console.error("WhatsApp alert error:", err);
  }
}

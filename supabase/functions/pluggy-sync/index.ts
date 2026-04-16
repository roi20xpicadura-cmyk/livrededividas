import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a service-role call (from webhook) or user call
    const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "___never___");

    let userId: string;

    if (isServiceRole) {
      const body = await req.json();
      userId = body.userId;
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required for service calls" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const body = isServiceRole ? { connectionId: (await req.clone().json()).connectionId } : await req.json();
    const { connectionId } = body;
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminDb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conn } = await adminDb
      .from("bank_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminDb.from("bank_connections").update({ status: "syncing" }).eq("id", connectionId);

    const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
    const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

    const authRes = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    if (!authRes.ok) throw new Error(`Pluggy auth failed [${authRes.status}]`);
    const { apiKey } = await authRes.json();

    // Get accounts
    const accountsRes = await fetch(
      `https://api.pluggy.ai/accounts?itemId=${conn.pluggy_item_id}`,
      { headers: { "X-API-KEY": apiKey } }
    );
    if (!accountsRes.ok) throw new Error(`Pluggy accounts failed [${accountsRes.status}]`);
    const { results: accounts } = await accountsRes.json();

    // Update balance
    if (accounts?.length > 0) {
      const account = accounts[0];
      await adminDb.from("bank_connections").update({
        balance: account.balance,
        available_balance: account.creditData?.availableCreditLimit || account.balance,
        last_sync_at: new Date().toISOString(),
        status: "active",
        account_name: account.name || conn.account_name,
        account_number: account.number || conn.account_number,
        account_type: account.type || conn.account_type,
      }).eq("id", connectionId);
    }

    // Get transactions (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    let totalSynced = 0;

    for (const account of accounts || []) {
      const txRes = await fetch(
        `https://api.pluggy.ai/transactions?accountId=${account.id}&from=${ninetyDaysAgo.toISOString().split("T")[0]}`,
        { headers: { "X-API-KEY": apiKey } }
      );
      if (!txRes.ok) continue;
      const { results: transactions } = await txRes.json();

      for (const tx of transactions || []) {
        await adminDb.from("bank_transactions_raw").upsert({
          user_id: userId,
          connection_id: connectionId,
          pluggy_transaction_id: tx.id,
          date: tx.date.split("T")[0],
          description: tx.description,
          amount: Math.abs(tx.amount),
          type: tx.amount > 0 ? "CREDIT" : "DEBIT",
          category: tx.category,
          merchant_name: tx.merchant?.name,
        }, { onConflict: "pluggy_transaction_id" });
        totalSynced++;
      }
    }

    const { count } = await adminDb
      .from("bank_transactions_raw")
      .select("*", { count: "exact", head: true })
      .eq("connection_id", connectionId)
      .eq("imported", false)
      .eq("ignored", false);

    return new Response(
      JSON.stringify({ synced: true, totalSynced, pendingImport: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("pluggy-sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

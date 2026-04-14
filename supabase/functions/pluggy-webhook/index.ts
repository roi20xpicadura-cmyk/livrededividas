import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store webhook event
    await supabase.from("pluggy_webhooks").insert({
      event_type: payload.event,
      item_id: payload.itemId,
      payload,
    });

    // If item was updated, trigger sync
    if (payload.event === "item/updated") {
      const { data: conn } = await supabase
        .from("bank_connections")
        .select("id, user_id")
        .eq("pluggy_item_id", payload.itemId)
        .single();

      if (conn) {
        // Trigger sync via edge function
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/pluggy-sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              connectionId: conn.id,
              userId: conn.user_id,
            }),
          }
        );
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("pluggy-webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

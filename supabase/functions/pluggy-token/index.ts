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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
    const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Pluggy credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate with Pluggy
    const authRes = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`Pluggy auth failed [${authRes.status}]: ${errText}`);
    }
    const { apiKey } = await authRes.json();

    // Create connect token
    const tokenRes = await fetch("https://api.pluggy.ai/connect_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        clientUserId: userId,
        webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/pluggy-webhook`,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Pluggy connect_token failed [${tokenRes.status}]: ${errText}`);
    }
    const { accessToken } = await tokenRes.json();

    return new Response(JSON.stringify({ accessToken, apiKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("pluggy-token error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

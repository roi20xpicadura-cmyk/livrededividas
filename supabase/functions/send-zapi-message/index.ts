import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const INSTANCE = Deno.env.get("ZAPI_INSTANCE_ID")!;
const TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const CLIENT = Deno.env.get("ZAPI_CLIENT_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://api.z-api.io/instances/${INSTANCE}/token/${TOKEN}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": CLIENT,
        },
        body: JSON.stringify({ phone, message }),
      },
    );

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  return new Response(JSON.stringify({ publicKey }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});

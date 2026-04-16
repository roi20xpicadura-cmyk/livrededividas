import { corsHeaders } from '@supabase/supabase-js/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') ?? 'mailto:oi@korafinance.com.br';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload = (await req.json()) as PushPayload;
    if (!payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: 'title and body required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const ids = payload.user_ids ?? (payload.user_id ? [payload.user_id] : []);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_id or user_ids required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .in('user_id', ids);

    if (error) throw error;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/app',
      tag: payload.tag,
    });

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];

    for (const row of subs ?? []) {
      try {
        await webpush.sendNotification(JSON.parse(row.subscription), message);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(row.id);
        failed++;
        console.error('Push failed:', status, (e as Error).message);
      }
    }

    if (stale.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', stale);
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, removed: stale.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('send-push error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

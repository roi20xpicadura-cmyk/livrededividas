// Hotmart webhook: ativa/desativa plano após eventos de compra
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Map Hotmart product/offer codes → internal plan
// Configure HOTMART_PRO_OFFER e HOTMART_BUSINESS_OFFER nos secrets
// Hardcoded fallbacks (safety net se secrets não estiverem setados corretamente)
const HARDCODED_PRO_OFFERS = ['p5itoui4'];
const HARDCODED_BUSINESS_OFFERS = ['ir7ki0tu'];

function resolvePlan(offerCode: string | undefined, productName: string | undefined): 'pro' | 'business' | null {
  const proOffer = (Deno.env.get('HOTMART_PRO_OFFER') || '').trim();
  const businessOffer = (Deno.env.get('HOTMART_BUSINESS_OFFER') || '').trim();
  const code = (offerCode || '').trim();

  console.log('resolvePlan inputs', {
    receivedOfferCode: code,
    proOfferEnv: proOffer,
    businessOfferEnv: businessOffer,
    productName,
  });

  if (code) {
    if (proOffer && code === proOffer) return 'pro';
    if (businessOffer && code === businessOffer) return 'business';
    if (HARDCODED_PRO_OFFERS.includes(code)) return 'pro';
    if (HARDCODED_BUSINESS_OFFERS.includes(code)) return 'business';
  }

  const name = (productName || '').toLowerCase();
  if (name.includes('business')) return 'business';
  if (name.includes('pro')) return 'pro';
  // Fallback final: se vem do produto Kora Finance e tem offer code, assume Pro
  if (code && name.includes('kor')) return 'pro';
  return null;
}

async function sendWhatsApp(phone: string, message: string) {
  const ZAPI_INSTANCE = Deno.env.get('ZAPI_INSTANCE_ID');
  const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
  const ZAPI_CLIENT = Deno.env.get('ZAPI_CLIENT_TOKEN');
  if (!ZAPI_INSTANCE || !ZAPI_TOKEN || !ZAPI_CLIENT) return;
  try {
    await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT },
        body: JSON.stringify({ phone, message }),
      },
    );
  } catch (e) {
    console.error('zapi send error', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Verify HOTTOK security token
  const expectedHottok = Deno.env.get('HOTMART_HOTTOK');
  const sentHottok = req.headers.get('x-hotmart-hottok');
  if (expectedHottok && sentHottok !== expectedHottok) {
    return new Response(JSON.stringify({ error: 'invalid hottok' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = body.event || body.eventName;
  const data = body.data || body;
  const buyerEmail: string | undefined = data?.buyer?.email || data?.purchase?.buyer?.email;
  const offerCode: string | undefined = data?.purchase?.offer?.code || data?.product?.offer?.code;
  const productName: string | undefined = data?.product?.name;
  const transactionId: string | undefined = data?.purchase?.transaction;

  console.log('hotmart webhook', { event, buyerEmail, offerCode, productName, transactionId });

  if (!buyerEmail) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no email' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find user by email via auth admin
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('list users error', listErr);
    return new Response(JSON.stringify({ error: 'user lookup failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const authUser = usersList.users.find(u => (u.email || '').toLowerCase() === buyerEmail.toLowerCase());
  if (!authUser) {
    console.warn('user not found for email', buyerEmail, 'total users:', usersList.users.length);
    return new Response(JSON.stringify({ ok: true, skipped: 'user not found', email: buyerEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = authUser.id;
  console.log('user found', { userId, email: authUser.email });
  const isApproved = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'].includes(event);
  const isCancelled = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'SUBSCRIPTION_CANCELLATION'].includes(event);

  if (isApproved) {
    const newPlan = resolvePlan(offerCode, productName);
    if (!newPlan) {
      console.warn('could not resolve plan', { offerCode, productName });
      return new Response(JSON.stringify({ ok: true, skipped: 'unknown plan', offerCode, productName }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    console.log('updating plan', { userId, newPlan, expiresAt: expiresAt.toISOString() });
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ plan: newPlan, plan_expires_at: expiresAt.toISOString() } as any)
      .eq('id', userId);
    if (upErr) console.error('plan update error', upErr);
    else console.log('✅ plan updated successfully', { userId, newPlan });

    // WhatsApp notification (optional)
    const { data: waConn } = await supabase
      .from('whatsapp_connections')
      .select('phone_number')
      .eq('user_id', userId)
      .eq('verified', true)
      .maybeSingle();

    if (waConn?.phone_number) {
      const planName = newPlan === 'pro' ? 'Pro' : 'Business';
      const benefits = newPlan === 'business'
        ? 'Kora IA, WhatsApp IA, Dívidas, Negócio e DRE'
        : 'Kora IA, WhatsApp IA, Dívidas e Simulador';
      await sendWhatsApp(
        waConn.phone_number,
        `🎉 *Plano ${planName} ativado!*\n\nSeu pagamento foi confirmado e todos os benefícios já estão liberados:\n\n✅ ${benefits}\n\nAcesse o app: https://korafinance.app\n\n_KoraFinance 🐨_`,
      );
    }

    return new Response(JSON.stringify({ ok: true, plan: newPlan, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (isCancelled) {
    await supabase
      .from('profiles')
      .update({ plan: 'free', plan_expires_at: null } as any)
      .eq('id', userId);
    return new Response(JSON.stringify({ ok: true, plan: 'free', userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, ignored: event }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

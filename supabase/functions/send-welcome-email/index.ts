import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Resend's default verified sender until notify.korafinance.app is verified.
const FROM = 'KoraFinance <onboarding@resend.dev>';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const { email, name } = await req.json();
    if (!email) throw new Error('email is required');
    const firstName = (name?.split(' ')[0]) || 'usuário';

    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:48px;">🐨</div>
      <div style="font-size:20px;font-weight:600;color:#22c55e;margin-top:8px;">KoraFinance</div>
    </div>
    <div style="background:#161616;border:1px solid #262626;border-radius:16px;padding:32px;">
      <h1 style="font-size:24px;margin:0 0 16px;color:#fff;">Bem-vindo, ${firstName}! 👋</h1>
      <p style="font-size:15px;line-height:1.6;color:#a3a3a3;margin:0 0 24px;">
        Sua vida financeira começa agora. O KoraFinance vai te ajudar a sair das dívidas, guardar dinheiro e realizar seus sonhos — com IA do seu lado.
      </p>
      <a href="https://korafinance.app/app" style="display:inline-block;background:#22c55e;color:#0a0a0a;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;">Começar agora →</a>
    </div>
    <div style="margin-top:32px;padding:24px;background:#161616;border:1px solid #262626;border-radius:16px;">
      <h2 style="font-size:16px;margin:0 0 16px;color:#fff;">3 primeiros passos</h2>
      <div style="margin-bottom:12px;color:#a3a3a3;font-size:14px;">💸 Adicione seu primeiro lançamento</div>
      <div style="margin-bottom:12px;color:#a3a3a3;font-size:14px;">🎯 Crie uma meta financeira</div>
      <div style="color:#a3a3a3;font-size:14px;">💬 Converse com a Kora IA</div>
    </div>
    <p style="text-align:center;font-size:12px;color:#525252;margin-top:32px;">
      🔒 Nunca pedimos sua senha do banco. Sem anúncios. LGPD.<br/><br/>
      KoraFinance · <a href="https://korafinance.app" style="color:#22c55e;">korafinance.app</a>
    </p>
  </div>
</body></html>`;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `Bem-vindo ao KoraFinance, ${firstName}! 🐨`,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Don't break signup if email provider fails (e.g. unverified domain).
      console.error(`send-welcome-email skipped [${res.status}]:`, data);
      return new Response(
        JSON.stringify({ success: false, skipped: true, status: res.status, error: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-welcome-email error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // Best-effort: never block signup on email failure.
    return new Response(JSON.stringify({ success: false, skipped: true, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

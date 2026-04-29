// Auth Email Hook — envia emails de autenticação via Resend
// Recebe webhook do Supabase Auth, valida assinatura, renderiza template branded,
// e dispara via Resend gateway (connector Lovable).
//
// Configuração no Supabase: Cloud → Auth → Hooks → Send Email Hook
//   URL:    https://chkgnqrfrtovcpqwogeg.supabase.co/functions/v1/auth-email-resend
//   Secret: SEND_EMAIL_HOOK_SECRET (já configurado nos secrets do projeto)

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

const FROM = 'Kora <nao-responda@korafinance.app>';
const APP_NAME = 'Kora Finance';
const APP_URL = 'https://korafinance.app';
const LOGO_URL = 'https://korafinance.app/icon-512.png'; // servido pelo PWA
const SUPPORT_EMAIL = 'oi@korafinance.app';

// Paleta Kora
const COLORS = {
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

// ============================================================
// Template base — header com logo + footer LGPD
// ============================================================
function baseLayout(opts: {
  preheader: string;
  heading: string;
  intro: string;
  ctaLabel?: string;
  ctaUrl?: string;
  afterCta?: string;
  fallbackUrl?: string;
  expiryNote?: string;
}): string {
  const { preheader, heading, intro, ctaLabel, ctaUrl, afterCta, fallbackUrl, expiryNote } = opts;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.surface};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;max-height:0;max-width:0;mso-hide:all;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.surface};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${COLORS.bg};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 32px 8px 32px;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="56" height="56" style="display:block;border-radius:12px;">
            </td>
          </tr>
          <!-- Conteúdo -->
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;line-height:1.3;color:${COLORS.text};letter-spacing:-0.01em;">${escapeHtml(heading)}</h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${COLORS.text};">${intro}</p>
              ${ctaUrl && ctaLabel ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:${COLORS.primary};">
                    <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>` : ''}
              ${afterCta ? `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${COLORS.muted};">${afterCta}</p>` : ''}
              ${fallbackUrl ? `
              <p style="margin:24px 0 8px 0;font-size:13px;line-height:1.5;color:${COLORS.muted};">Se o botão acima não funcionar, copie e cole este link no seu navegador:</p>
              <p style="margin:0 0 16px 0;font-size:12px;line-height:1.5;color:${COLORS.primary};word-break:break-all;"><a href="${escapeAttr(fallbackUrl)}" style="color:${COLORS.primary};text-decoration:underline;">${escapeHtml(fallbackUrl)}</a></p>` : ''}
              ${expiryNote ? `<p style="margin:24px 0 0 0;padding:12px 16px;background-color:${COLORS.surface};border-radius:8px;font-size:13px;line-height:1.5;color:${COLORS.muted};">⏱️ ${escapeHtml(expiryNote)}</p>` : ''}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <div style="height:1px;background-color:${COLORS.border};"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px 40px;">
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:${COLORS.muted};">
                Não foi você que solicitou? Pode ignorar este email com tranquilidade — nada vai acontecer com sua conta.
              </p>
              <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
                <strong style="color:${COLORS.text};">${APP_NAME}</strong> — Sua vida financeira com IA<br>
                <a href="${APP_URL}" style="color:${COLORS.muted};text-decoration:none;">${APP_URL.replace('https://', '')}</a> · <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.muted};text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:12px 0 0 0;font-size:11px;line-height:1.5;color:${COLORS.muted};">
                Email transacional automático · Você está recebendo porque tem uma conta no ${APP_NAME}.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:${COLORS.muted};">© ${new Date().getFullYear()} ${APP_NAME}. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// ============================================================
// Templates por tipo de evento
// ============================================================
type AuthEmailType = 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change' | 'reauthentication';

function renderTemplate(type: AuthEmailType, ctx: {
  confirmationUrl: string;
  token?: string;
  email?: string;
  newEmail?: string;
}): { subject: string; html: string } {
  switch (type) {
    case 'signup':
      return {
        subject: 'Confirme seu email pra começar no Kora 💜',
        html: baseLayout({
          preheader: 'Falta só um clique pra ativar sua conta no Kora.',
          heading: 'Bem-vindo(a) ao Kora! 🎉',
          intro: 'Que bom ter você aqui. Pra ativar sua conta e começar a organizar sua vida financeira com IA, é só confirmar seu email clicando no botão abaixo:',
          ctaLabel: 'Confirmar meu email',
          ctaUrl: ctx.confirmationUrl,
          fallbackUrl: ctx.confirmationUrl,
          expiryNote: 'Este link expira em 24 horas por motivos de segurança.',
        }),
      };

    case 'recovery':
      return {
        subject: 'Redefinir sua senha do Kora',
        html: baseLayout({
          preheader: 'Recebemos um pedido pra redefinir sua senha.',
          heading: 'Redefinir sua senha 🔐',
          intro: 'Recebemos um pedido pra redefinir a senha da sua conta no Kora. Clique no botão abaixo pra criar uma nova senha:',
          ctaLabel: 'Criar nova senha',
          ctaUrl: ctx.confirmationUrl,
          fallbackUrl: ctx.confirmationUrl,
          expiryNote: 'Este link expira em 1 hora. Se não foi você quem pediu, pode ignorar.',
        }),
      };

    case 'magiclink':
      return {
        subject: 'Seu link mágico de acesso ao Kora ✨',
        html: baseLayout({
          preheader: 'Clique pra entrar na sua conta sem senha.',
          heading: 'Seu link de acesso chegou ✨',
          intro: 'Use o botão abaixo pra entrar na sua conta no Kora sem precisar digitar senha:',
          ctaLabel: 'Entrar no Kora',
          ctaUrl: ctx.confirmationUrl,
          fallbackUrl: ctx.confirmationUrl,
          expiryNote: 'Este link expira em 1 hora e só funciona uma vez.',
        }),
      };

    case 'invite':
      return {
        subject: `Você foi convidado(a) pro ${APP_NAME} 💜`,
        html: baseLayout({
          preheader: 'Aceite seu convite pra começar.',
          heading: 'Você tem um convite! 🎁',
          intro: `Alguém te convidou pra usar o ${APP_NAME} — o app que organiza sua vida financeira com inteligência artificial. Clique no botão pra aceitar e criar sua conta:`,
          ctaLabel: 'Aceitar convite',
          ctaUrl: ctx.confirmationUrl,
          fallbackUrl: ctx.confirmationUrl,
          expiryNote: 'Este convite expira em 7 dias.',
        }),
      };

    case 'email_change':
      return {
        subject: 'Confirme a mudança do seu email no Kora',
        html: baseLayout({
          preheader: 'Confirme o novo endereço de email.',
          heading: 'Confirmar novo email 📧',
          intro: `Você pediu pra trocar o email da sua conta no ${APP_NAME}${ctx.email ? ` de <strong>${escapeHtml(ctx.email)}</strong>` : ''}${ctx.newEmail ? ` para <strong>${escapeHtml(ctx.newEmail)}</strong>` : ''}. Confirme clicando abaixo:`,
          ctaLabel: 'Confirmar novo email',
          ctaUrl: ctx.confirmationUrl,
          fallbackUrl: ctx.confirmationUrl,
          expiryNote: 'Este link expira em 24 horas.',
        }),
      };

    case 'reauthentication':
      return {
        subject: `Seu código de verificação: ${ctx.token ?? ''}`,
        html: baseLayout({
          preheader: `Seu código: ${ctx.token ?? ''}`,
          heading: 'Código de verificação 🔢',
          intro: `Use o código abaixo pra confirmar essa ação na sua conta do ${APP_NAME}:`,
          afterCta: `<div style="text-align:center;margin:24px 0;padding:24px;background-color:${COLORS.surface};border-radius:12px;font-family:'JetBrains Mono',Consolas,Monaco,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:${COLORS.primary};">${escapeHtml(ctx.token ?? '------')}</div>`,
          expiryNote: 'Este código expira em 10 minutos.',
        }),
      };

    default:
      return {
        subject: `Notificação do ${APP_NAME}`,
        html: baseLayout({
          preheader: 'Notificação da sua conta.',
          heading: 'Notificação da sua conta',
          intro: 'Você tem uma notificação da sua conta no Kora. Clique no botão abaixo pra continuar:',
          ctaLabel: 'Continuar',
          ctaUrl: ctx.confirmationUrl,
          fallbackUrl: ctx.confirmationUrl,
        }),
      };
  }
}

// ============================================================
// Envio via Resend Gateway
// ============================================================
const RESEND_GATEWAY = 'https://connector-gateway.lovable.dev/resend';

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

  const response = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Resend API failed [${response.status}]: ${body}`);
  }
  console.log(`✅ Email "${subject}" enviado pra ${to}`);
}

// ============================================================
// Handler — recebe webhook Supabase Auth, valida, renderiza, envia
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
    if (!HOOK_SECRET) {
      console.error('SEND_EMAIL_HOOK_SECRET is not configured');
      return new Response(JSON.stringify({ error: 'webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Validar assinatura do webhook (Supabase usa Standard Webhooks)
    // O secret vem como "v1,whsec_xxxx" — strip prefixo se presente
    const cleanSecret = HOOK_SECRET.replace(/^v1,whsec_/, '').replace(/^whsec_/, '');
    const wh = new Webhook(cleanSecret);

    let event: any;
    try {
      event = wh.verify(payload, headers);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user, email_data } = event;
    if (!user?.email || !email_data) {
      return new Response(JSON.stringify({ error: 'invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailType = (email_data.email_action_type ?? 'signup') as AuthEmailType;
    const confirmationUrl = email_data.redirect_to
      ? `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`
      : `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}`;

    const { subject, html } = renderTemplate(emailType, {
      confirmationUrl,
      token: email_data.token,
      email: user.email,
      newEmail: user.new_email,
    });

    await sendViaResend(user.email, subject, html);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('auth-email-resend error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
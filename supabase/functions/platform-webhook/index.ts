// Generic platform webhook receiver
// URL pattern: /platform-webhook/{platform_id}/{user_id}
// Supports: kiwify, shopify, stripe, eduzz, monetizze, mercadopago,
//           pagseguro, paypal, woocommerce, yampi, nuvemshop
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PLATFORM_NAMES: Record<string, string> = {
  kiwify: 'Kiwify',
  shopify: 'Shopify',
  stripe: 'Stripe',
  eduzz: 'Eduzz',
  monetizze: 'Monetizze',
  mercadopago: 'Mercado Pago',
  pagseguro: 'PagSeguro',
  paypal: 'PayPal',
  woocommerce: 'WooCommerce',
  yampi: 'Yampi',
  nuvemshop: 'Nuvemshop',
};

const PLATFORM_CATEGORY: Record<string, string> = {
  kiwify: 'Vendas Online',
  shopify: 'Vendas Online',
  stripe: 'Receita Recorrente',
  eduzz: 'Vendas Online',
  monetizze: 'Vendas Online',
  mercadopago: 'Recebimentos',
  pagseguro: 'Recebimentos',
  paypal: 'Recebimentos',
  woocommerce: 'Vendas Online',
  yampi: 'Vendas Online',
  nuvemshop: 'Vendas Online',
};

interface ParsedSale {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  source_id: string;
  isRefund?: boolean;
}

/* Parsers per platform — return null when event should be ignored */
function parseKiwify(body: any): ParsedSale | null {
  // https://kiwify.com.br/docs/webhooks
  const status = body.order_status || body.webhook_event_type;
  const isRefund = ['refunded', 'chargeback'].includes(String(status).toLowerCase());
  const isApproved = ['paid', 'approved', 'order_approved'].includes(String(status).toLowerCase());
  if (!isApproved && !isRefund) return null;

  const id = body.order_id || body.id || body.webhook_event_id;
  const amount = Number(body.Commissions?.charge_amount || body.charge_amount || body.amount || body.product_amount || 0) / (body.charge_amount > 1000 ? 100 : 1);
  const productName = body.Product?.product_name || body.product_name || 'Venda Kiwify';
  const date = body.created_at || body.approved_date || new Date().toISOString();

  return {
    type: 'income',
    amount: Math.abs(amount),
    description: `${isRefund ? '[Reembolso] ' : ''}${productName}`,
    date: String(date).slice(0, 10),
    source_id: `kiwify:${id}`,
    isRefund,
  };
}

function parseShopify(body: any): ParsedSale | null {
  // Shopify orders/create or orders/paid
  const id = body.id || body.order_id;
  if (!id) return null;
  const amount = Number(body.total_price || body.current_total_price || 0);
  if (amount <= 0) return null;
  const customer = body.customer ? `${body.customer.first_name || ''} ${body.customer.last_name || ''}`.trim() : '';
  return {
    type: 'income',
    amount,
    description: `Pedido Shopify #${body.order_number || id}${customer ? ` — ${customer}` : ''}`,
    date: String(body.created_at || new Date().toISOString()).slice(0, 10),
    source_id: `shopify:${id}`,
  };
}

function parseStripe(body: any): ParsedSale | null {
  // Stripe events: payment_intent.succeeded, charge.refunded, invoice.paid
  const event = body.type;
  if (!event) return null;
  const obj = body.data?.object;
  if (!obj) return null;

  const isRefund = event === 'charge.refunded';
  const isPayment = ['payment_intent.succeeded', 'charge.succeeded', 'invoice.paid'].includes(event);
  if (!isPayment && !isRefund) return null;

  const amount = Number(obj.amount_received || obj.amount_paid || obj.amount || 0) / 100;
  if (amount <= 0) return null;

  return {
    type: 'income',
    amount,
    description: `${isRefund ? '[Reembolso] ' : ''}Stripe — ${obj.description || obj.statement_descriptor || event}`,
    date: new Date((obj.created || Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    source_id: `stripe:${obj.id}`,
    isRefund,
  };
}

function parseEduzz(body: any): ParsedSale | null {
  const status = body.trans_status || body.status;
  const approved = ['paid', 'completed', 'pago', 'finalizada'].includes(String(status).toLowerCase());
  if (!approved) return null;
  const id = body.trans_cod || body.id;
  const amount = Number(body.trans_value || body.amount || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `Eduzz — ${body.product_name || body.product_description || 'Venda'}`,
    date: String(body.trans_createddate || new Date().toISOString()).slice(0, 10),
    source_id: `eduzz:${id}`,
  };
}

function parseMonetizze(body: any): ParsedSale | null {
  const status = body.venda?.status || body.status;
  if (String(status).toLowerCase() !== 'finalizada') return null;
  const id = body.venda?.codigo || body.codigo;
  const amount = Number(body.venda?.valor || body.valor || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `Monetizze — ${body.produto?.nome || 'Venda'}`,
    date: String(body.venda?.dataInicio || new Date().toISOString()).slice(0, 10),
    source_id: `monetizze:${id}`,
  };
}

function parseMercadoPago(body: any): ParsedSale | null {
  // Notification: { type: 'payment', data: { id: 'xxx' } }
  // Real payment data must be fetched separately — here we treat the notification as a stub
  // For a full impl, you'd fetch /v1/payments/{id}. We accept inline payment payloads too.
  const status = body.status || body.data?.status;
  if (status && status !== 'approved') return null;
  const id = body.id || body.data?.id;
  const amount = Number(body.transaction_amount || body.data?.transaction_amount || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `Mercado Pago — ${body.description || body.data?.description || `Pagamento #${id}`}`,
    date: String(body.date_approved || body.date_created || new Date().toISOString()).slice(0, 10),
    source_id: `mercadopago:${id}`,
  };
}

function parsePagSeguro(body: any): ParsedSale | null {
  const status = body.status || body.charges?.[0]?.status;
  if (status && !['PAID', 'AVAILABLE', '3', '4'].includes(String(status))) return null;
  const id = body.id || body.code || body.reference_id;
  const amountCents = Number(body.amount?.value || body.charges?.[0]?.amount?.value || 0);
  const amount = amountCents / 100;
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `PagSeguro — ${body.description || `#${id}`}`,
    date: String(body.created_at || new Date().toISOString()).slice(0, 10),
    source_id: `pagseguro:${id}`,
  };
}

function parsePaypal(body: any): ParsedSale | null {
  const event = body.event_type;
  const approved = ['PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.COMPLETED'].includes(event);
  const refund = event === 'PAYMENT.CAPTURE.REFUNDED';
  if (!approved && !refund) return null;
  const resource = body.resource;
  const id = resource?.id;
  const amount = Number(resource?.amount?.value || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `${refund ? '[Reembolso] ' : ''}PayPal — ${resource?.description || `Pagamento ${id}`}`,
    date: String(resource?.create_time || new Date().toISOString()).slice(0, 10),
    source_id: `paypal:${id}`,
    isRefund: refund,
  };
}

function parseWooCommerce(body: any): ParsedSale | null {
  const status = body.status;
  if (!['processing', 'completed'].includes(String(status))) return null;
  const id = body.id || body.order_id;
  const amount = Number(body.total || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `WooCommerce — Pedido #${body.number || id}`,
    date: String(body.date_created || new Date().toISOString()).slice(0, 10),
    source_id: `woocommerce:${id}`,
  };
}

function parseYampi(body: any): ParsedSale | null {
  const status = body.resource?.status?.alias || body.status;
  if (!['paid', 'authorized', 'completed'].includes(String(status))) return null;
  const id = body.resource?.id || body.id;
  const amount = Number(body.resource?.totals?.total || body.total || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `Yampi — Pedido #${body.resource?.number || id}`,
    date: String(body.resource?.created_at || new Date().toISOString()).slice(0, 10),
    source_id: `yampi:${id}`,
  };
}

function parseNuvemshop(body: any): ParsedSale | null {
  const event = body.event;
  if (!['order/paid', 'order/created'].includes(event)) return null;
  const id = body.id || body.resource?.id;
  const amount = Number(body.resource?.total || body.total || 0);
  if (amount <= 0 || !id) return null;
  return {
    type: 'income',
    amount,
    description: `Nuvemshop — Pedido #${body.resource?.number || id}`,
    date: String(body.resource?.created_at || new Date().toISOString()).slice(0, 10),
    source_id: `nuvemshop:${id}`,
  };
}

const PARSERS: Record<string, (body: any) => ParsedSale | null> = {
  kiwify: parseKiwify,
  shopify: parseShopify,
  stripe: parseStripe,
  eduzz: parseEduzz,
  monetizze: parseMonetizze,
  mercadopago: parseMercadoPago,
  pagseguro: parsePagSeguro,
  paypal: parsePaypal,
  woocommerce: parseWooCommerce,
  yampi: parseYampi,
  nuvemshop: parseNuvemshop,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // URL parsing: /functions/v1/platform-webhook/{platform}/{userId}
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // segments: [functions, v1, platform-webhook, platform, userId]
  const platform = segments[segments.length - 2];
  const userId = segments[segments.length - 1];

  if (!platform || !PARSERS[platform]) {
    return new Response(
      JSON.stringify({ error: 'unknown platform', platform, supported: Object.keys(PARSERS) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!userId || !UUID_RE.test(userId)) {
    return new Response(
      JSON.stringify({ error: 'invalid userId in URL' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // GET = health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ ok: true, platform, userId, message: 'Webhook endpoint ready' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let body: any;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  console.log(`[${platform}] webhook for user ${userId}`, JSON.stringify(body).slice(0, 500));

  const sale = PARSERS[platform](body);
  if (!sale) {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'event not relevant', event: body.event || body.type || body.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Dedupe via notes field
  const noteTag = `src:${sale.source_id}`;
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('notes', noteTag)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'duplicate', source_id: sale.source_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Insert transaction
  const { error: insErr } = await supabase.from('transactions').insert({
    user_id: userId,
    type: sale.isRefund ? 'expense' : sale.type,
    description: sale.description,
    amount: sale.amount,
    date: sale.date,
    category: sale.isRefund ? 'Reembolso' : (PLATFORM_CATEGORY[platform] || 'Vendas'),
    origin: 'business',
    source: platform,
    notes: noteTag,
  });

  if (insErr) {
    console.error(`[${platform}] insert error:`, insErr);
    return new Response(
      JSON.stringify({ error: 'insert failed', details: insErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Update integrations row counters
  const { data: integ } = await supabase
    .from('integrations')
    .select('id, total_imported')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle();

  if (integ) {
    await supabase
      .from('integrations')
      .update({
        status: 'active',
        last_sync_at: new Date().toISOString(),
        total_imported: (integ.total_imported || 0) + 1,
      })
      .eq('id', integ.id);
  } else {
    await supabase.from('integrations').insert({
      user_id: userId,
      platform,
      platform_display_name: PLATFORM_NAMES[platform] || platform,
      method: 'webhook',
      status: 'active',
      last_sync_at: new Date().toISOString(),
      total_imported: 1,
    });
  }

  console.log(`[${platform}] ✅ imported R$${sale.amount} for user ${userId}`);

  return new Response(
    JSON.stringify({ ok: true, imported: true, amount: sale.amount, source_id: sale.source_id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

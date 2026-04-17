import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID')!;
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN')!;
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  const withCode = clean.startsWith('55') ? clean : `55${clean}`;

  const res = await fetch(
    `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone: withCode, message }),
    },
  );

  if (!res.ok) {
    console.error(`Failed to send to ${withCode}:`, await res.text());
    return false;
  }
  console.log(`✅ Sent to ${withCode}`);
  return true;
}

function fmt(value: number): string {
  return 'R$ ' + value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function getUserData(userId: string) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [txRes, budgetRes, goalRes, debtRes, profileRes] = await Promise.all([
    supabase.from('transactions')
      .select('type, amount, category, date')
      .eq('user_id', userId)
      .gte('date', firstDay)
      .is('deleted_at', null),
    supabase.from('budgets')
      .select('category, limit_amount')
      .eq('user_id', userId)
      .eq('month_year', monthYear),
    supabase.from('goals')
      .select('name, current_amount, target_amount')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase.from('debts')
      .select('name, remaining_amount, due_day')
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase.from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single(),
  ]);

  const txs = txRes.data || [];
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const catMap: Record<string, number> = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });

  const budgets = (budgetRes.data || []).map(b => ({
    ...b,
    spent: catMap[b.category] || 0,
    pct: ((catMap[b.category] || 0) / Number(b.limit_amount)) * 100,
  }));

  const lastTxDate = txs.length > 0
    ? [...txs].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : null;
  const daysSinceLastTx = lastTxDate
    ? Math.floor((now.getTime() - new Date(lastTxDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const weekTxs = txs.filter(t => t.date >= weekAgo);
  const weekExpenses = weekTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  // Debts due in next 7 days, based on due_day
  const today = now.getDate();
  const debtsDueSoon = (debtRes.data || [])
    .filter(d => d.due_day != null)
    .map(d => {
      let daysUntil = (d.due_day as number) - today;
      if (daysUntil < 0) {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        daysUntil = (daysInMonth - today) + (d.due_day as number);
      }
      return { ...d, daysUntil };
    })
    .filter(d => d.daysUntil >= 0 && d.daysUntil <= 7);

  return {
    name: profileRes.data?.full_name?.split(' ')[0] || 'usuário',
    income,
    expenses,
    balance: income - expenses,
    budgets,
    goals: goalRes.data || [],
    debtsDueSoon,
    daysSinceLastTx,
    weekExpenses,
    isMonthStart: now.getDate() === 1,
    isMonday: now.getDay() === 1,
    dayOfMonth: now.getDate(),
  };
}

function decideNotification(data: any): string | null {
  const {
    name, income, expenses, balance, budgets, goals, debtsDueSoon,
    daysSinceLastTx, weekExpenses, isMonthStart, isMonday, dayOfMonth,
  } = data;

  // 1. DEBT DUE SOON
  if (debtsDueSoon.length > 0) {
    const debt = debtsDueSoon[0];
    const d = debt.daysUntil;
    return `⚠️ *Lembrete de dívida, ${name}!*

💳 *${debt.name}*
💵 ${fmt(Number(debt.remaining_amount))}
📅 Vence ${d === 0 ? 'HOJE' : d === 1 ? 'amanhã' : `em ${d} dias`}

Não deixa passar! Pague antes de acumular juros. 💪

_KoraFinance 🐨_`;
  }

  // 2. BUDGET OVERSPENT
  const overspent = budgets.find((b: any) => b.pct >= 100);
  if (overspent) {
    return `🚨 *Orçamento estourado, ${name}!*

📂 *${overspent.category}*
💸 Gasto: ${fmt(overspent.spent)}
🎯 Limite: ${fmt(Number(overspent.limit_amount))}
📊 ${overspent.pct.toFixed(0)}% do orçamento usado

Tenta segurar os gastos nessa categoria até o fim do mês! 💪

_KoraFinance 🐨_`;
  }

  // 3. BUDGET WARNING
  const warning = budgets.find((b: any) => b.pct >= 80 && b.pct < 100);
  if (warning) {
    return `⚠️ *Atenção ao orçamento, ${name}!*

📂 *${warning.category}*
📊 Você usou *${warning.pct.toFixed(0)}%* do limite
💸 ${fmt(warning.spent)} de ${fmt(Number(warning.limit_amount))}

Ainda dá pra controlar! Fique de olho 👀

_KoraFinance 🐨_`;
  }

  // 4. INACTIVE USER
  if (daysSinceLastTx >= 3 && daysSinceLastTx < 999) {
    const msgs = [
      `👋 *Oi ${name}, tudo bem?*\n\nFaz ${daysSinceLastTx} dias que você não registra nenhum gasto.\n\nNão esquece de anotar suas despesas! Manda aqui mesmo:\n💸 _"gastei X em Y"_\n\n_KoraFinance 🐨_`,
      `🐨 *${name}, a Kora sentiu sua falta!*\n\nVocê sumiu há ${daysSinceLastTx} dias...\n\nManda um gasto aqui que eu registro na hora! 😄\n💸 _"gastei X em Y"_\n\n_KoraFinance 🐨_`,
      `📊 *Ei ${name}!*\n\nSem registros há ${daysSinceLastTx} dias. Seu controle financeiro agradece quando você anota tudo! 💪\n\nManda aqui: _"gastei X em Y"_\n\n_KoraFinance 🐨_`,
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // 5. MONTHLY START
  if (isMonthStart) {
    const emoji = balance >= 0 ? '✅' : '⚠️';
    return `🎊 *Novo mês, ${name}!*

${emoji} Saldo do mês passado: *${fmt(balance)}*
💸 Gastos: ${fmt(expenses)}
💰 Receitas: ${fmt(income)}

Bora começar esse mês ainda melhor! 🚀

_KoraFinance 🐨_`;
  }

  // 6. WEEKLY SUMMARY
  if (isMonday && weekExpenses > 0) {
    return `📊 *Resumo da semana, ${name}!*

💸 Você gastou *${fmt(weekExpenses)}* nos últimos 7 dias
💰 Saldo do mês: *${fmt(balance)}*

${balance >= 0 ? '✅ Você está indo bem! Continue assim 💪' : '⚠️ Fique de olho nos gastos essa semana!'}

_KoraFinance 🐨_`;
  }

  // 7. GOAL MILESTONE
  const nearGoal = (goals as any[]).find(g => {
    const pct = (Number(g.current_amount) / Number(g.target_amount)) * 100;
    return pct >= 50 && pct < 100;
  });
  if (nearGoal && dayOfMonth === 15) {
    const pct = (Number(nearGoal.current_amount) / Number(nearGoal.target_amount)) * 100;
    return `🎯 *Você está quase lá, ${name}!*

Meta: *${nearGoal.name}*
📊 ${pct.toFixed(0)}% concluída
💵 ${fmt(Number(nearGoal.current_amount))} de ${fmt(Number(nearGoal.target_amount))}

Continua assim! Cada real conta 💪

_KoraFinance 🐨_`;
  }

  // 8. POSITIVE BALANCE
  if (dayOfMonth === 10 && balance > 0) {
    return `💚 *Boa notícia, ${name}!*

Você está com *${fmt(balance)}* de saldo positivo até agora! 🎉

Continue registrando seus gastos para manter o controle até o fim do mês 💪

_KoraFinance 🐨_`;
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔔 Running WhatsApp notifications...');

  const { data: connections } = await supabase
    .from('whatsapp_connections')
    .select('user_id, phone_number')
    .eq('verified', true)
    .eq('active', true)
    .not('phone_number', 'is', null);

  if (!connections?.length) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, skipped: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let sent = 0;
  let skipped = 0;

  for (const conn of connections) {
    try {
      const data = await getUserData(conn.user_id);
      const message = decideNotification(data);

      if (!message) {
        skipped++;
        continue;
      }

      const ok = await sendWhatsApp(conn.phone_number, message);
      if (ok) sent++;

      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Error for user ${conn.user_id}:`, err);
    }
  }

  console.log(`✅ Done: ${sent} sent, ${skipped} skipped`);

  return new Response(
    JSON.stringify({ success: true, sent, skipped }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

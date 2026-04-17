import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmt(v: number): string {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function brDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("pt-BR");
}

async function fetchTransactions(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("date, type, amount, category, description, origin")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchUserName(userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
  return data?.full_name?.split(" ")[0] || "usuário";
}

function buildSummaryText(name: string, periodLabel: string, txs: any[]): string {
  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expenses;

  const catMap: Record<string, number> = {};
  txs.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const catLines = topCats.length
    ? topCats.map(([c, v]) => `  • ${c}: ${fmt(v)}`).join("\n")
    : "  Nenhum gasto registrado";

  return `📊 *Resumo Financeiro — ${periodLabel}*

👤 ${name}
📝 ${txs.length} lançamento${txs.length !== 1 ? "s" : ""}

💰 Receitas: *${fmt(income)}*
💸 Despesas: *${fmt(expenses)}*
${balance >= 0 ? "✅" : "⚠️"} Saldo: *${fmt(balance)}*

🏆 *Top categorias:*
${catLines}

_Kora IA 🐨_`;
}

function buildCSV(txs: any[]): string {
  const header = "Data,Tipo,Valor,Categoria,Descrição,Origem\n";
  const rows = txs.map(t => {
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [
      brDate(t.date),
      t.type === "income" ? "Receita" : "Despesa",
      Number(t.amount).toFixed(2).replace(".", ","),
      escape(t.category),
      escape(t.description),
      escape(t.origin),
    ].join(",");
  }).join("\n");
  return "\uFEFF" + header + rows; // BOM for Excel UTF-8
}

// Brand palette (KoraFinance green)
const BRAND: [number, number, number] = [22, 163, 74];
const BRAND_DARK: [number, number, number] = [21, 128, 61];
const BRAND_LIGHT: [number, number, number] = [220, 252, 231];

function drawKoraLogo(doc: any, x: number, y: number) {
  // Rounded square badge with stylized "K"
  doc.setFillColor(...BRAND);
  doc.roundedRect(x, y, 12, 12, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("K", x + 6, y + 8.4, { align: "center" });
  doc.setFont("helvetica", "normal");
}

function buildPDF(name: string, periodLabel: string, txs: any[]): Uint8Array {
  const doc = new jsPDF();
  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expenses;

  // ── Header band ──
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 32, "F");
  drawKoraLogo(doc, 14, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("KoraFinance", 30, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Relatório Financeiro — ${periodLabel}`, 30, 24);
  doc.setFontSize(8);
  doc.text(`Cliente: ${name}  •  Gerado em ${new Date().toLocaleString("pt-BR")}`, 30, 29);

  // ── Summary box ──
  doc.setDrawColor(220);
  doc.setFillColor(248, 250, 248);
  doc.roundedRect(14, 38, 182, 22, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("RECEITAS", 20, 45);
  doc.text("DESPESAS", 80, 45);
  doc.text("SALDO", 140, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND);
  doc.text(fmt(income), 20, 54);
  doc.setTextColor(220, 38, 38);
  doc.text(fmt(expenses), 80, 54);
  doc.setTextColor(...(balance >= 0 ? BRAND : [220, 38, 38] as [number, number, number]));
  doc.text(fmt(balance), 140, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`${txs.length} lançamento${txs.length !== 1 ? "s" : ""}`, 196, 58, { align: "right" });

  // ── Top 5 categories bar chart (expenses) ──
  let y = 68;
  const catMap: Record<string, number> = {};
  txs.filter(t => t.type === "expense").forEach(t => {
    const c = t.category || "Outros";
    catMap[c] = (catMap[c] || 0) + Number(t.amount);
  });
  const top5 = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (top5.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text("Top 5 Categorias de Despesa", 14, y);
    y += 5;

    const chartX = 14;
    const chartY = y;
    const chartW = 182;
    const rowH = 9;
    const labelW = 50;
    const valueW = 35;
    const barAreaW = chartW - labelW - valueW - 6;
    const maxVal = top5[0][1] || 1;

    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(230);
    doc.roundedRect(chartX, chartY, chartW, rowH * top5.length + 6, 2, 2, "FD");

    top5.forEach(([cat, val], i) => {
      const ry = chartY + 4 + i * rowH;
      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60);
      const label = cat.length > 22 ? cat.slice(0, 20) + "…" : cat;
      doc.text(label, chartX + 3, ry + 4);
      // Bar background
      doc.setFillColor(...BRAND_LIGHT);
      doc.roundedRect(chartX + labelW, ry, barAreaW, 5, 1, 1, "F");
      // Bar fill
      const w = Math.max(1, (val / maxVal) * barAreaW);
      doc.setFillColor(...(i === 0 ? BRAND_DARK : BRAND));
      doc.roundedRect(chartX + labelW, ry, w, 5, 1, 1, "F");
      // Value
      doc.setTextColor(60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(fmt(val), chartX + chartW - 3, ry + 4, { align: "right" });
    });

    y = chartY + rowH * top5.length + 12;
  }

  // ── Transactions table header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Lançamentos", 14, y);
  y += 4;

  doc.setFillColor(...BRAND);
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.rect(14, y, 182, 7, "F");
  y += 5;
  doc.text("Data", 16, y);
  doc.text("Tipo", 36, y);
  doc.text("Categoria", 56, y);
  doc.text("Descrição", 96, y);
  doc.text("Valor", 194, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");

  doc.setTextColor(40);
  doc.setFontSize(8);
  for (const t of txs) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    const isIncome = t.type === "income";
    doc.setTextColor(isIncome ? 22 : 220, isIncome ? 163 : 38, isIncome ? 74 : 38);
    doc.text(brDate(t.date), 16, y);
    doc.text(isIncome ? "Receita" : "Despesa", 36, y);
    doc.setTextColor(40);
    doc.text(String(t.category || "").slice(0, 20), 56, y);
    doc.text(String(t.description || "").slice(0, 40), 96, y);
    doc.setTextColor(isIncome ? 22 : 220, isIncome ? 163 : 38, isIncome ? 74 : 38);
    doc.text((isIncome ? "+" : "-") + fmt(Number(t.amount)), 178, y, { align: "right" });
    y += 5;
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`KoraFinance • Página ${i}/${pageCount}`, 105, 290, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

async function uploadAndSign(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const { error: upErr } = await supabase.storage.from("wpp-reports").upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage.from("wpp-reports").createSignedUrl(path, 60 * 60 * 24); // 24h
  if (error) throw error;
  return data.signedUrl;
}

async function sendZapiText(phone: string, message: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, message }),
  });
}

async function sendZapiDocument(phone: string, documentUrl: string, fileName: string, ext: string) {
  // Z-API: POST /send-document/{extension} with body { phone, document, fileName }
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-document/${ext}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, document: documentUrl, fileName }),
  });
  const txt = await res.text();
  console.log("[Z-API send-document]", res.status, txt.slice(0, 300));
  if (!res.ok) throw new Error(`Z-API document error ${res.status}: ${txt.slice(0, 200)}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, phone, format, startDate, endDate, periodLabel } = await req.json();

    if (!userId || !phone || !format || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = await fetchUserName(userId);
    const txs = await fetchTransactions(userId, startDate, endDate);
    const label = periodLabel || `${brDate(startDate)} a ${brDate(endDate)}`;

    if (txs.length === 0) {
      await sendZapiText(phone, `📭 Não encontrei nenhum lançamento no período *${label}*, ${name}.\n\nQue tal registrar algum gasto? Me manda algo como _"gastei 50 no mercado"_ 😉`);
      return new Response(JSON.stringify({ ok: true, count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "summary") {
      await sendZapiText(phone, buildSummaryText(name, label, txs));
      return new Response(JSON.stringify({ ok: true, format, count: txs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const ts = Date.now();

    if (format === "csv") {
      const csv = buildCSV(txs);
      const bytes = new TextEncoder().encode(csv);
      const path = `${userId}/${ts}-relatorio-${slug}.csv`;
      const signedUrl = await uploadAndSign(path, bytes, "text/csv; charset=utf-8");
      await sendZapiText(phone, `📊 *Planilha pronta, ${name}!*\n\n📅 Período: ${label}\n📝 ${txs.length} lançamentos\n\nEnviando arquivo CSV...`);
      await sendZapiDocument(phone, signedUrl, `relatorio-${slug}.csv`, "csv");
      return new Response(JSON.stringify({ ok: true, format, count: txs.length, url: signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "pdf") {
      const bytes = buildPDF(name, label, txs);
      const path = `${userId}/${ts}-relatorio-${slug}.pdf`;
      const signedUrl = await uploadAndSign(path, bytes, "application/pdf");
      await sendZapiText(phone, `📄 *Relatório PDF pronto, ${name}!*\n\n📅 Período: ${label}\n📝 ${txs.length} lançamentos\n\nEnviando arquivo...`);
      await sendZapiDocument(phone, signedUrl, `relatorio-${slug}.pdf`, "pdf");
      return new Response(JSON.stringify({ ok: true, format, count: txs.length, url: signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "invalid format" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("whatsapp-export error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// supabase/functions/kora-vision/index.ts
//
// KORA VISION — extrai transações de imagens (cupom, extrato, fatura, PIX).
// Usa Sonnet 4.6 pelo custo/qualidade de vision.
// Imagem NÃO é armazenada em Storage (decisão do usuário); só metadata
// (image_type, merchant, total) em kora_interactions.
//
// Rate limit: Free = 5/mês, Pro/Business = ilimitado (checkVisionLimit).
// Auth: JWT obrigatório (nunca aceita body.user_id sem validação).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  authenticateKoraRequest,
  assertKoraV2Enabled,
  koraAuthErrorResponse,
  KoraAuthError,
} from "../_shared/kora-auth.ts";
import {
  checkVisionLimit,
  incrementVisionUsage,
} from "../_shared/kora-limits.ts";
import {
  callAnthropic,
  type AnthropicContentBlock,
} from "../_shared/kora-llm.ts";
import { estimateCostUSD } from "../_shared/kora-personas.ts";
import { normalizeCategory, type TransactionOrigin, type TransactionType } from "../_shared/kora-categories.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

interface VisionRequest {
  user_id?: string;
  image_base64: string;
  image_media_type?: string;
  hint?: string;
  auto_create?: boolean;
  origin?: TransactionOrigin;
}

interface ExtractedTransaction {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  confidence: number;
  raw_line?: string;
}

interface VisionResponse {
  success: boolean;
  image_type:
    | "fiscal_receipt"
    | "credit_card_bill"
    | "bank_statement"
    | "pix_receipt"
    | "unknown";
  merchant?: string;
  detected_date?: string;
  total_amount?: number;
  transactions: ExtractedTransaction[];
  pending_action_ids: string[];
  auto_created_transaction_ids: string[];
  message: string;
  cost_usd: number;
  remaining_monthly?: number;
  error?: string;
}

const VISION_SYSTEM_PROMPT = `Você é a Kora, IA financeira do KoraFinance. Analise imagens de documentos financeiros brasileiros e extraia transações com precisão.

Tipos esperados:
- Cupom fiscal / NFC-e (supermercado, restaurante, farmácia)
- Fatura de cartão de crédito
- Extrato bancário (print ou impresso)
- Comprovante de PIX / TED / DOC

Responda APENAS um objeto JSON válido:
{
  "image_type": "fiscal_receipt" | "credit_card_bill" | "bank_statement" | "pix_receipt" | "unknown",
  "merchant": "Nome do estabelecimento se aplicável",
  "detected_date": "YYYY-MM-DD se conseguir identificar",
  "total_amount": número,
  "transactions": [
    {
      "description": "string curta",
      "amount": número (sempre positivo),
      "type": "expense" | "income",
      "category": "uma categoria plausível em português",
      "date": "YYYY-MM-DD",
      "confidence": 0.0 a 1.0,
      "raw_line": "texto original da imagem"
    }
  ]
}

REGRAS:
1. SÓ extraia transações que tem CERTEZA. Borrado/cortado → confidence baixo (<0.6).
2. CUPOM FISCAL = UMA transação só (o total). Não fragmente item por item.
3. EXTRATO / FATURA = cada linha uma transação separada.
4. Valores: sempre positivos. O type diz se é expense ou income.
5. Datas em YYYY-MM-DD. Se não identificar, use hoje.
6. Não é documento financeiro → image_type="unknown", transactions=[].

Sem markdown. Sem \`\`\`. Só o JSON.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse({ ...emptyResponse(), error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body: VisionRequest;
  try {
    body = (await req.json()) as VisionRequest;
  } catch {
    return jsonResponse({ ...emptyResponse(), error: "invalid json body" }, 400);
  }

  let authCtx;
  try {
    authCtx = await authenticateKoraRequest(req, supabase, body.user_id);
    assertKoraV2Enabled(authCtx);
  } catch (err) {
    if (err instanceof KoraAuthError) return koraAuthErrorResponse(err);
    return jsonResponse({ ...emptyResponse(), error: "auth_failed" }, 500);
  }

  try {
    // Rate limit (Free = 5/mês)
    const visionCheck = await checkVisionLimit(supabase, authCtx.userId, authCtx.plan);
    if (!visionCheck.allowed) {
      return jsonResponse(
        {
          ...emptyResponse(),
          message: visionCheck.userMessage ?? "Limite mensal de fotos atingido.",
          remaining_monthly: 0,
          error: "rate_limited",
        },
        429,
      );
    }

    // Validação da imagem
    if (!body.image_base64 || body.image_base64.length < 100) {
      return jsonResponse(
        { ...emptyResponse(), message: "Imagem inválida ou vazia." },
        400,
      );
    }
    const cleanBase64 = body.image_base64.replace(/^data:image\/\w+;base64,/, "");
    // Tamanho aproximado do decoded = base64_len * 3 / 4
    const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return jsonResponse(
        {
          ...emptyResponse(),
          message: "Imagem muito grande. Máximo 10MB.",
        },
        413,
      );
    }

    const mediaType = body.image_media_type ?? "image/jpeg";
    const origin: TransactionOrigin = body.origin === "business" ? "business" : "personal";

    // Prompt multimodal
    const userContent: AnthropicContentBlock[] = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: cleanBase64 },
      },
      {
        type: "text",
        text: body.hint
          ? `Dica do usuário: "${body.hint}". Analise a imagem seguindo o formato JSON.`
          : "Analise essa imagem e extraia as transações seguindo o formato JSON.",
      },
    ];

    const aiResult = await callAnthropic({
      model: "sonnet-4-6",
      system: VISION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 2000,
      anthropicKey,
    });

    // Parse JSON
    const textBlock = aiResult.content.find((b) => b.type === "text");
    const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
    const clean = rawText.replace(/^```(json)?|```$/gm, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(clean) as Record<string, unknown>;
    } catch {
      console.error("[kora-vision] JSON parse failed:", rawText.slice(0, 300));
      return jsonResponse(
        {
          ...emptyResponse(),
          message: "Não consegui ler essa imagem direito. Tenta outra ou me conta por texto.",
          cost_usd: aiResult.costUsd,
        },
        200,
      );
    }

    const imageType = validImageType(parsed.image_type);
    const rawTxs = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    const validTxs: ExtractedTransaction[] = rawTxs
      .filter(isValidExtractedTx)
      .map((t) => ({
        description: String(t.description).slice(0, 200),
        amount: Number(t.amount),
        type: t.type === "income" ? "income" : "expense",
        category: normalizeCategory(
          typeof t.category === "string" ? t.category : undefined,
          origin,
          t.type === "income" ? "income" : "expense",
        ),
        date:
          typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date)
            ? t.date
            : new Date().toISOString().slice(0, 10),
        confidence: Math.max(0, Math.min(1, Number(t.confidence ?? 0.7))),
        raw_line: typeof t.raw_line === "string" ? t.raw_line.slice(0, 300) : undefined,
      }));

    // Consome cota SÓ se houver resposta útil
    if (validTxs.length > 0 || imageType !== "unknown") {
      await incrementVisionUsage(supabase, authCtx.userId);
    }

    const avgConfidence =
      validTxs.length > 0
        ? validTxs.reduce((s, t) => s + t.confidence, 0) / validTxs.length
        : 0;

    // Mensagem pra imagem não-financeira / confiança baixa
    if (imageType === "unknown" || validTxs.length === 0) {
      await logInteraction(supabase, authCtx.userId, body.hint, rawText, aiResult, parsed);
      return jsonResponse({
        ...emptyResponse(),
        image_type: "unknown",
        message:
          "Não consegui identificar transações financeiras nessa imagem. Pode mandar uma foto mais nítida, ou explicar por texto?",
        cost_usd: aiResult.costUsd,
      });
    }

    if (avgConfidence < 0.5) {
      await logInteraction(supabase, authCtx.userId, body.hint, rawText, aiResult, parsed);
      return jsonResponse({
        ...emptyResponse(),
        image_type: imageType,
        merchant: strOrUndef(parsed.merchant),
        detected_date: strOrUndef(parsed.detected_date),
        total_amount: numOrUndef(parsed.total_amount),
        transactions: validTxs,
        message:
          "Li a imagem mas com confiança baixa. Confere os valores? Se algo tá errado, me corrige por texto.",
        cost_usd: aiResult.costUsd,
      });
    }

    // Cria ações (pending ou auto-created)
    const pendingActionIds: string[] = [];
    const autoCreatedIds: string[] = [];

    for (const tx of validTxs) {
      const canAuto = body.auto_create && tx.confidence >= 0.8;

      if (canAuto) {
        const { data: inserted, error: insErr } = await supabase
          .from("transactions")
          .insert({
            user_id: authCtx.userId,
            amount: tx.amount,
            type: tx.type,
            origin,
            category: tx.category,
            description: tx.description,
            date: tx.date,
            source: "kora_vision",
          })
          .select("id")
          .single();

        if (!insErr && inserted?.id) {
          autoCreatedIds.push(inserted.id as string);
          await supabase.from("kora_actions").insert({
            user_id: authCtx.userId,
            action_type: "create_transaction",
            status: "auto_executed",
            payload: { ...tx, origin },
            result: { transaction_id: inserted.id, source: "vision" },
            executed_at: new Date().toISOString(),
          });
        }
      } else {
        const { data: action } = await supabase
          .from("kora_actions")
          .insert({
            user_id: authCtx.userId,
            action_type: "create_transaction",
            status: "pending",
            payload: { ...tx, origin },
            reasoning: `Extraída de ${imageType} via Kora Vision (conf ${Math.round(tx.confidence * 100)}%)`,
          })
          .select("id")
          .single();
        if (action?.id) pendingActionIds.push(action.id as string);
      }
    }

    const message = buildVisionMessage({
      imageType,
      merchant: strOrUndef(parsed.merchant),
      transactions: validTxs,
      autoCreated: autoCreatedIds.length,
      pendingCount: pendingActionIds.length,
    });

    await logInteraction(supabase, authCtx.userId, body.hint, message, aiResult, parsed, [
      ...pendingActionIds,
    ]);

    const remaining =
      Number.isFinite(visionCheck.remaining)
        ? Math.max(0, visionCheck.remaining - 1)
        : undefined;

    return jsonResponse({
      success: true,
      image_type: imageType,
      merchant: strOrUndef(parsed.merchant),
      detected_date: strOrUndef(parsed.detected_date),
      total_amount: numOrUndef(parsed.total_amount),
      transactions: validTxs,
      pending_action_ids: pendingActionIds,
      auto_created_transaction_ids: autoCreatedIds,
      message,
      cost_usd: aiResult.costUsd,
      remaining_monthly: remaining,
    });
  } catch (err) {
    console.error("[kora-vision] error:", err);
    return jsonResponse(
      {
        ...emptyResponse(),
        message: "Tive um problema analisando essa imagem. Tenta de novo ou manda por texto.",
        error: err instanceof Error ? err.message : "internal",
      },
      500,
    );
  }
});

// ==========================================================
// HELPERS
// ==========================================================

function emptyResponse(): VisionResponse {
  return {
    success: false,
    image_type: "unknown",
    transactions: [],
    pending_action_ids: [],
    auto_created_transaction_ids: [],
    message: "",
    cost_usd: 0,
  };
}

function validImageType(v: unknown): VisionResponse["image_type"] {
  const allowed: Array<VisionResponse["image_type"]> = [
    "fiscal_receipt",
    "credit_card_bill",
    "bank_statement",
    "pix_receipt",
    "unknown",
  ];
  return typeof v === "string" && (allowed as string[]).includes(v)
    ? (v as VisionResponse["image_type"])
    : "unknown";
}

function isValidExtractedTx(v: unknown): v is {
  description: string;
  amount: number;
  type: string;
  category?: string;
  date?: string;
  confidence?: number;
  raw_line?: string;
} {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const amtOk =
    typeof o.amount === "number" && o.amount > 0 && o.amount < 1_000_000;
  const typeOk = o.type === "expense" || o.type === "income";
  const descOk = typeof o.description === "string" && o.description.length > 0;
  return Boolean(amtOk && typeOk && descOk);
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function buildVisionMessage(params: {
  imageType: VisionResponse["image_type"];
  merchant?: string;
  transactions: ExtractedTransaction[];
  autoCreated: number;
  pendingCount: number;
}): string {
  const brl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const typeLabel: Record<string, string> = {
    fiscal_receipt: "cupom fiscal",
    credit_card_bill: "fatura de cartão",
    bank_statement: "extrato",
    pix_receipt: "comprovante de PIX",
  };
  const tLabel = typeLabel[params.imageType] ?? "documento";

  if (params.transactions.length === 1) {
    const tx = params.transactions[0];
    const merchantPart = params.merchant ? ` em ${params.merchant}` : "";
    if (params.autoCreated > 0) {
      return `Registrei: ${brl(tx.amount)}${merchantPart}, categorizado como ${tx.category}. Se quiser ajustar, me fala.`;
    }
    return `Identifiquei ${tLabel}: ${brl(tx.amount)}${merchantPart} em ${tx.category}. Confirma pra eu registrar?`;
  }

  const total = params.transactions.reduce((s, t) => s + t.amount, 0);
  if (params.autoCreated > 0 && params.pendingCount === 0) {
    return `Registrei ${params.autoCreated} transações do ${tLabel}, total de ${brl(total)}.`;
  }
  if (params.pendingCount > 0 && params.autoCreated === 0) {
    return `Encontrei ${params.pendingCount} transações no ${tLabel}, total ${brl(total)}. Quer que eu registre todas ou prefere revisar?`;
  }
  return `Processei o ${tLabel}: ${params.autoCreated} registradas automaticamente, ${params.pendingCount} aguardando confirmação (total ${brl(total)}).`;
}

async function logInteraction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  hint: string | undefined,
  message: string,
  aiResult: { inputTokens: number; outputTokens: number; costUsd: number },
  parsed: Record<string, unknown>,
  actionIds: string[] = [],
): Promise<void> {
  await supabase.from("kora_interactions").insert({
    user_id: userId,
    channel: "app",
    input_type: "image",
    persona: "default",
    user_message: hint ?? "[imagem enviada]",
    kora_response: message,
    model_used: "sonnet-4-6",
    input_tokens: aiResult.inputTokens,
    output_tokens: aiResult.outputTokens,
    cost_usd: aiResult.costUsd,
    triggered_action_ids: actionIds.length > 0 ? actionIds : null,
    metadata: {
      image_type: parsed.image_type,
      merchant: parsed.merchant,
      total_amount: parsed.total_amount,
    },
  });
  // estimateCostUSD usado implicitamente por aiResult, mas importamos
  // pra manter o compilador vendo o símbolo referenciado (consistência).
  void estimateCostUSD;
}

function jsonResponse(body: VisionResponse | { success: boolean; error: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

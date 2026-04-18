// supabase/functions/_shared/kora-llm.ts
//
// Cliente compartilhado pra chamar a API Anthropic.
// - Resolve o ID real do modelo via MODEL_API_IDS (centralizado em kora-personas)
// - Retry exponencial em 429/500/502/503/504/529
// - Retorna tokens + custo calculado por estimateCostUSD
// - Ponto único pra logar latência e falhas depois (quando adicionar observability)

import {
  estimateCostUSD,
  MODEL_API_IDS,
  type ModelKey,
} from "./kora-personas.ts";

export interface AnthropicImageSource {
  type: "base64";
  media_type: string;
  data: string;
}

export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export interface AnthropicImageBlock {
  type: "image";
  source: AnthropicImageSource;
}

export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicCallParams {
  model: ModelKey;
  system: string;
  messages: AnthropicMessage[];
  maxTokens: number;
  tools?: AnthropicTool[];
  anthropicKey: string;
}

export interface AnthropicCallResult {
  content: AnthropicContentBlock[];
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: ModelKey;
}

export class AnthropicError extends Error {
  constructor(
    public readonly status: number,
    public readonly upstreamBody: string,
  ) {
    super(`Anthropic API ${status}: ${upstreamBody.slice(0, 300)}`);
    this.name = "AnthropicError";
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const BACKOFF_FACTOR = 3;

/**
 * Chama a API Anthropic com retry exponencial.
 * Backoff: 500ms → 1500ms → 4500ms (não conta o request original).
 */
export async function callAnthropic(
  params: AnthropicCallParams,
): Promise<AnthropicCallResult> {
  const { model, system, messages, maxTokens, tools, anthropicKey } = params;

  const body: Record<string, unknown> = {
    model: MODEL_API_IDS[model],
    max_tokens: maxTokens,
    system,
    messages,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
          await sleep(BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, attempt));
          continue;
        }
        throw new AnthropicError(res.status, errText);
      }

      const data = (await res.json()) as {
        content?: AnthropicContentBlock[];
        stop_reason?: string | null;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;

      return {
        content: Array.isArray(data.content) ? data.content : [],
        stopReason: data.stop_reason ?? null,
        inputTokens,
        outputTokens,
        costUsd: estimateCostUSD(model, inputTokens, outputTokens),
        model,
      };
    } catch (err) {
      if (err instanceof AnthropicError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt >= MAX_RETRIES) throw lastError;
      await sleep(BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, attempt));
    }
  }

  throw lastError ?? new Error("Anthropic call failed after retries");
}

/**
 * Extrai texto concatenado e chamadas de tool de um resultado.
 */
export function parseAnthropicResult(result: AnthropicCallResult): {
  text: string;
  toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }>;
} {
  let text = "";
  const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

  for (const block of result.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use") {
      toolUses.push({ id: block.id, name: block.name, input: block.input });
    }
  }
  return { text, toolUses };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

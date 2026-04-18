// supabase/functions/kora-audio/index.ts
//
// KORA AUDIO — transcreve áudio do usuário e repassa pro kora-brain.
// Escopo: APENAS channel="app". WhatsApp tem seu próprio fluxo Gemini no
// whatsapp-webhook (que é INTOCÁVEL). Se receber channel=whatsapp, rejeita 400.
//
// Fluxo:
//   1. Autentica (JWT) + feature flag
//   2. Baixa bytes do áudio (base64 ou URL)
//   3. Transcreve via OpenAI Whisper (pt-BR)
//   4. POST pra kora-brain com input_type="audio" e message=transcription
//   5. Retorna resposta do brain + transcrição
//
// Custo: Whisper ~$0.006/min. Plano Free pode usar (cota lá é sobre Opus/Vision).
// Se virar abuso, implementa limite específico de áudio na Fase 4+.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  authenticateKoraRequest,
  assertKoraV2Enabled,
  koraAuthErrorResponse,
  KoraAuthError,
} from "../_shared/kora-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB (limite do Whisper)

interface AudioRequest {
  user_id?: string;
  channel: "app";
  audio_base64?: string;
  audio_url?: string;
  audio_media_type?: string;
}

interface AudioResponse {
  success: boolean;
  transcription: string;
  kora_response?: Record<string, unknown>;
  error?: string;
}

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

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return jsonResponse(
      { success: false, transcription: "", error: "OPENAI_API_KEY not configured" },
      500,
    );
  }

  let body: AudioRequest;
  try {
    body = (await req.json()) as AudioRequest;
  } catch {
    return jsonResponse({ success: false, transcription: "", error: "invalid json" }, 400);
  }

  // Escopo restrito: só "app". WhatsApp áudio é tratado pelo whatsapp-webhook (Gemini).
  if (body.channel !== "app") {
    return jsonResponse(
      {
        success: false,
        transcription: "",
        error: "this endpoint only accepts channel='app'. WhatsApp audio is handled by whatsapp-webhook (Gemini).",
      },
      400,
    );
  }

  let authCtx;
  try {
    authCtx = await authenticateKoraRequest(req, supabase, body.user_id);
    assertKoraV2Enabled(authCtx);
  } catch (err) {
    if (err instanceof KoraAuthError) return koraAuthErrorResponse(err);
    return jsonResponse({ success: false, transcription: "", error: "auth_failed" }, 500);
  }

  try {
    // 1) Bytes do áudio
    const audioBlob = await loadAudioBlob(body);

    if (audioBlob.size > MAX_AUDIO_BYTES) {
      return jsonResponse(
        {
          success: false,
          transcription: "",
          error: `Áudio muito grande (${Math.round(audioBlob.size / 1024 / 1024)}MB). Máximo 25MB.`,
        },
        413,
      );
    }

    // 2) Transcrição via Whisper
    const transcription = await transcribeWhisper(audioBlob, openaiKey);

    if (!transcription.trim()) {
      return jsonResponse({
        success: true,
        transcription: "",
        kora_response: {
          response_text: "Não consegui entender o áudio. Pode tentar de novo ou me escrever?",
        },
      });
    }

    // 3) Repassa pro kora-brain (chamada interna service_role)
    const brainRes = await callKoraBrain(authCtx.userId, transcription);

    return jsonResponse({
      success: true,
      transcription,
      kora_response: brainRes,
    });
  } catch (err) {
    console.error("[kora-audio] error:", err);
    return jsonResponse(
      {
        success: false,
        transcription: "",
        error: err instanceof Error ? err.message : "internal error",
      },
      500,
    );
  }
});

// ==========================================================
// HELPERS
// ==========================================================

async function loadAudioBlob(body: AudioRequest): Promise<Blob> {
  const mediaType = body.audio_media_type ?? "audio/ogg";

  if (body.audio_base64) {
    const clean = body.audio_base64.replace(/^data:audio\/\w+;base64,/, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mediaType });
  }

  if (body.audio_url) {
    const res = await fetch(body.audio_url);
    if (!res.ok) {
      throw new Error(`Falha ao baixar áudio (status ${res.status})`);
    }
    return await res.blob();
  }

  throw new Error("Forneça audio_base64 ou audio_url");
}

async function transcribeWhisper(blob: Blob, apiKey: string): Promise<string> {
  const ext = extensionFromMime(blob.type);
  const formData = new FormData();
  formData.append("file", blob, `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");
  formData.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Whisper API ${res.status}: ${errText.slice(0, 300)}`);
  }

  return (await res.text()).trim();
}

function extensionFromMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  if (lower.includes("wav")) return "wav";
  if (lower.includes("webm")) return "webm";
  return "ogg";
}

async function callKoraBrain(userId: string, message: string): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const res = await fetch(`${supabaseUrl}/functions/v1/kora-brain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      user_id: userId,
      channel: "app",
      input_type: "audio",
      message,
    }),
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: "invalid_brain_response", raw: text.slice(0, 300) };
  }
}

function jsonResponse(body: AudioResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

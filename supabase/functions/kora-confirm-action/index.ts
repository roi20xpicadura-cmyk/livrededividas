// supabase/functions/kora-confirm-action/index.ts
//
// Wrapper HTTP pra confirmAndExecuteAction de kora-tools.
// Chamado pelo frontend quando usuário clica "Confirma" numa ação pendente
// retornada pelo kora-brain (ex: "criar orçamento de R$ 500 em Alimentação?").
//
// Body:
//   { action_id: string, user_id?: string }
//
// Autenticação:
//   - JWT do usuário OU service_role + body.user_id
//   - Usuário só pode confirmar suas próprias ações (check em kora_actions.user_id
//     feito dentro do confirmAndExecuteAction)
//
// Efeito colateral especial: se a action é create_coaching_plan, o plano
// passa de status='pending' pra 'active' e agenda next_checkin.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  authenticateKoraRequest,
  assertKoraV2Enabled,
  koraAuthErrorResponse,
  KoraAuthError,
} from "../_shared/kora-auth.ts";
import {
  confirmAndExecuteAction,
  type ToolExecutionResult,
} from "../_shared/kora-tools.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConfirmRequest {
  action_id: string;
  user_id?: string;
}

interface ConfirmResponse {
  success: boolean;
  action_id?: string;
  result?: Record<string, unknown>;
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

  let body: ConfirmRequest;
  try {
    body = (await req.json()) as ConfirmRequest;
  } catch {
    return jsonResponse({ success: false, error: "invalid json body" }, 400);
  }

  if (!body.action_id || typeof body.action_id !== "string") {
    return jsonResponse({ success: false, error: "action_id required" }, 400);
  }

  let authCtx;
  try {
    authCtx = await authenticateKoraRequest(req, supabase, body.user_id);
    assertKoraV2Enabled(authCtx);
  } catch (err) {
    if (err instanceof KoraAuthError) return koraAuthErrorResponse(err);
    return jsonResponse({ success: false, error: "auth_failed" }, 500);
  }

  try {
    const result: ToolExecutionResult = await confirmAndExecuteAction(
      supabase,
      authCtx.userId,
      body.action_id,
    );

    if (!result.success) {
      return jsonResponse(
        {
          success: false,
          action_id: result.action_id,
          error: result.error ?? "action execution failed",
        },
        400,
      );
    }

    return jsonResponse({
      success: true,
      action_id: result.action_id,
      result: result.result,
    });
  } catch (err) {
    console.error("[kora-confirm-action] error:", err);
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : "internal error",
      },
      500,
    );
  }
});

function jsonResponse(body: ConfirmResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

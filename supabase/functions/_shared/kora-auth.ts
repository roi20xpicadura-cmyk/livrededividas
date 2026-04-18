// supabase/functions/_shared/kora-auth.ts
//
// Autenticação compartilhada pelos 4 endpoints Kora v2.
// - Chamadas de cliente (app/WhatsApp) → valida JWT do Supabase e extrai auth.uid()
// - Chamadas internas (kora-audio → kora-brain) → confia em body.user_id se
//   Authorization = service_role, porque já autenticou upstream
// - Aplica feature flag user_config.kora_v2_enabled: 404 pra quem não tem
//
// Um ponto único de auth evita bug de vazamento cross-user:
// endpoint que aceita user_id do body sem validar = qualquer usuário pega
// dados de qualquer outro. Esse arquivo fecha isso.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type PlanKey = "free" | "pro" | "business";

export interface KoraAuthContext {
  userId: string;
  plan: PlanKey;
  /** true quando chamada veio de outra kora-* function com service_role */
  isInternal: boolean;
  /** Feature flag user_config.kora_v2_enabled */
  koraV2Enabled: boolean;
}

export class KoraAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "KoraAuthError";
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida a origem de uma request Kora e retorna o contexto do usuário.
 *
 * @param req       Request bruta (pega Authorization header)
 * @param supabase  Client com service_role (usado pra auth.getUser e ler plan/flag)
 * @param bodyUserId  user_id vindo do body (usado só quando Authorization = service_role)
 */
export async function authenticateKoraRequest(
  req: Request,
  supabase: SupabaseClient,
  bodyUserId?: string,
): Promise<KoraAuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new KoraAuthError(401, "missing_auth", "Authorization header required");
  }

  const token = authHeader.slice(7).trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let userId: string;
  let isInternal = false;

  if (serviceRoleKey && token === serviceRoleKey) {
    // Chamada interna: outra kora-* function já autenticou o usuário lá atrás
    // e está repassando com service_role pra gente não revalidar JWT expirado.
    if (!bodyUserId || !UUID_RE.test(bodyUserId)) {
      throw new KoraAuthError(
        400,
        "invalid_user_id",
        "Internal calls must include a valid UUID user_id in body",
      );
    }
    userId = bodyUserId;
    isInternal = true;
  } else {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw new KoraAuthError(401, "invalid_token", "Invalid or expired token");
    }
    userId = data.user.id;
  }

  // Carrega plan + feature flag em paralelo
  const [profileRes, configRes] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    supabase.from("user_config").select("kora_v2_enabled").eq("user_id", userId).maybeSingle(),
  ]);

  const rawPlan = profileRes.data?.plan;
  const plan: PlanKey =
    rawPlan === "pro" || rawPlan === "business" ? rawPlan : "free";
  const koraV2Enabled = configRes.data?.kora_v2_enabled === true;

  return { userId, plan, isInternal, koraV2Enabled };
}

/**
 * Garante que o usuário tem a feature flag habilitada. Chamadas internas
 * passam (o endpoint upstream já fez o check).
 *
 * Retorna 404 (não 403) pra não expor a existência da feature — parece
 * que o endpoint simplesmente não existe pra quem não tem o flag.
 */
export function assertKoraV2Enabled(ctx: KoraAuthContext): void {
  if (!ctx.isInternal && !ctx.koraV2Enabled) {
    throw new KoraAuthError(404, "not_found", "Not found");
  }
}

/**
 * Helper pra converter KoraAuthError em Response HTTP.
 */
export function koraAuthErrorResponse(err: unknown): Response {
  if (err instanceof KoraAuthError) {
    return new Response(
      JSON.stringify({ error: err.code, message: err.message }),
      { status: err.status, headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ error: "internal", message: "Unexpected auth error" }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

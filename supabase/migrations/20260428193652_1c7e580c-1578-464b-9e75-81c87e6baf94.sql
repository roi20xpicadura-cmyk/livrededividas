-- Hardening de funções SECURITY DEFINER expostas
-- 1) Adicionar checagem de autorização nas funções que aceitam user_id arbitrário

CREATE OR REPLACE FUNCTION public.get_monthly_balances(p_user_id uuid)
RETURNS TABLE(month text, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: can only read own balances';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', t.date::date), 'YYYY-MM') AS month,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)::numeric AS balance
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.deleted_at IS NULL
  GROUP BY date_trunc('month', t.date::date)
  ORDER BY date_trunc('month', t.date::date) DESC
  LIMIT 6;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_kora_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  caller UUID := auth.uid();
  is_service BOOLEAN := (current_setting('request.jwt.claim.role', true) = 'service_role'
                         OR current_setting('role', true) = 'service_role');
BEGIN
  -- Permite chamadas via service_role (edge functions) sem auth.uid()
  IF NOT is_service THEN
    IF caller IS NULL THEN
      RAISE EXCEPTION 'auth required';
    END IF;
    IF caller <> p_user_id AND NOT public.has_role(caller, 'admin') THEN
      RAISE EXCEPTION 'forbidden: can only read own Kora context';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'memories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type',memory_type,'content',content,'importance',importance))
      FROM (
        SELECT memory_type, content, importance, created_at
        FROM public.kora_memory
        WHERE user_id = p_user_id AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY importance DESC, created_at DESC LIMIT 20
      ) m
    ), '[]'::jsonb),
    'profile', COALESCE((
      SELECT to_jsonb(p) - 'user_id' - 'last_updated_at'
      FROM public.kora_user_profile p WHERE p.user_id = p_user_id
    ), '{}'::jsonb),
    'active_plans', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id',id,'type',plan_type,'title',title,'progress',progress_percent,'next_checkin',next_checkin_at))
      FROM public.kora_coaching_plans WHERE user_id = p_user_id AND status = 'active'
    ), '[]'::jsonb),
    'recent_interactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date',created_at,'user_message',user_message,'kora_response',kora_response))
      FROM (
        SELECT created_at, user_message, kora_response
        FROM public.kora_interactions WHERE user_id = p_user_id
        ORDER BY created_at DESC LIMIT 5
      ) r
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$function$;

-- 2) Revogar EXECUTE de roles que não deveriam ter acesso

-- has_role: precisa de authenticated (RLS), mas não anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;

-- get_monthly_balances: só authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.get_monthly_balances(uuid) FROM anon, PUBLIC;

-- get_kora_context: só authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.get_kora_context(uuid) FROM anon, PUBLIC;

-- delete_user_kora_data: só authenticated (já valida auth.uid() internamente)
REVOKE EXECUTE ON FUNCTION public.delete_user_kora_data(uuid) FROM anon, PUBLIC;

-- kora_system_cost_today: só service_role (dado agregado de sistema)
REVOKE EXECUTE ON FUNCTION public.kora_system_cost_today() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_system_cost_today() TO service_role;
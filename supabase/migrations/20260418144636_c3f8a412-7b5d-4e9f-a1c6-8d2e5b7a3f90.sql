-- ==========================================================
-- KoraFinance — Kora Brain v2 (Fase 1: Schema + Fundação)
-- Migration: 20260418144636_c3f8a412-7b5d-4e9f-a1c6-8d2e5b7a3f90.sql
--
-- Introduz a infraestrutura de dados da Kora v2:
--   - Memória longa (kora_memory) + TTL automático
--   - Histórico de interações (kora_interactions)
--   - Log de ações executadas pela IA (kora_actions)
--   - Planos de coaching (kora_coaching_plans)
--   - Perfil psicográfico (kora_user_profile)
--   - Contadores de rate limit (kora_usage_limits)
--   - Circuit breaker (function kora_system_cost_today)
--   - LGPD "esquecer tudo" (function delete_user_kora_data)
--   - Feature flag (user_config.kora_v2_enabled)
--
-- Coexiste com ai-chat atual (não mexe nele). Rollout:
--   1) eu — 3 dias dogfood
--   2) 10 beta testers com flag manual
--   3) Pro/Business rollout gradual
--   4) Free recebe versão limitada (só Haiku, sem memória, sem coaching)
-- ==========================================================

BEGIN;

-- ==========================================================
-- 0. Extensões em tabelas existentes
-- ==========================================================

ALTER TABLE public.user_config
  ADD COLUMN IF NOT EXISTS kora_v2_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_config.kora_v2_enabled IS
  'Feature flag: quando TRUE, frontend usa kora-brain em vez de ai-chat.';

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS remaining_installments INTEGER;

COMMENT ON COLUMN public.debts.remaining_installments IS
  'Parcelas restantes (opcional). Usado pela tool create_debt da Kora v2.';

-- transactions.source já existe com default 'app' (migration 20260416235246).
-- Código da Kora vai setar 'kora_brain' ou 'kora_vision' explicitamente.


-- ==========================================================
-- 1. kora_memory — memória longa do usuário
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kora_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'fact', 'preference', 'pattern', 'event', 'goal_context', 'conversation'
  )),
  content TEXT NOT NULL,

  confidence REAL NOT NULL DEFAULT 0.8 CHECK (confidence BETWEEN 0 AND 1),
  importance REAL NOT NULL DEFAULT 0.5 CHECK (importance BETWEEN 0 AND 1),

  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_referenced_at TIMESTAMPTZ DEFAULT NOW(),
  reference_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kora_memory_user_type
  ON public.kora_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_kora_memory_user_importance
  ON public.kora_memory(user_id, importance DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kora_memory_active
  ON public.kora_memory(user_id)
  WHERE expires_at IS NULL OR expires_at > NOW();

ALTER TABLE public.kora_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own memories" ON public.kora_memory
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete own memories" ON public.kora_memory
  FOR DELETE USING (auth.uid() = user_id);


-- ==========================================================
-- 2. kora_interactions — histórico de conversas
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kora_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  channel TEXT NOT NULL CHECK (channel IN ('app', 'whatsapp', 'email', 'system')),
  input_type TEXT NOT NULL CHECK (input_type IN ('text', 'audio', 'image', 'trigger')),

  persona TEXT NOT NULL DEFAULT 'default' CHECK (persona IN (
    'default', 'coach', 'alert', 'summary', 'couple', 'business', 'emergency'
  )),

  user_message TEXT,
  kora_response TEXT,

  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 6),

  triggered_action_ids UUID[],
  user_rating SMALLINT CHECK (user_rating IN (-1, 0, 1)),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kora_interactions_user_date
  ON public.kora_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kora_interactions_channel
  ON public.kora_interactions(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kora_interactions_cost_today
  ON public.kora_interactions(created_at)
  WHERE cost_usd IS NOT NULL;

ALTER TABLE public.kora_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own interactions" ON public.kora_interactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete own interactions" ON public.kora_interactions
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all interactions" ON public.kora_interactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));


-- ==========================================================
-- 3. kora_actions — tool use log
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kora_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES public.kora_interactions(id) ON DELETE SET NULL,

  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_transaction',
    'update_transaction',
    'delete_transaction',
    'recategorize_transaction',
    'create_budget',
    'update_budget',
    'create_goal',
    'update_goal',
    'create_debt',
    'update_debt',
    'create_coaching_plan',
    'update_coaching_plan',
    'add_memory'
  )),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'executed', 'failed', 'rejected', 'auto_executed'
  )),

  payload JSONB NOT NULL,
  result JSONB,
  reasoning TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kora_actions_user_status
  ON public.kora_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_kora_actions_pending
  ON public.kora_actions(created_at)
  WHERE status = 'pending';

ALTER TABLE public.kora_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own actions" ON public.kora_actions
  FOR SELECT USING (auth.uid() = user_id);


-- ==========================================================
-- 4. kora_coaching_plans — planos ativos
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kora_coaching_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  plan_type TEXT NOT NULL CHECK (plan_type IN (
    'debt_payoff',
    'savings',
    'budget_recovery',
    'goal_achievement',
    'financial_education',
    'couple_alignment'
  )),

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  duration_days INTEGER,

  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_metrics JSONB,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'paused', 'completed', 'abandoned'
  )),
  progress_percent SMALLINT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),

  checkin_frequency TEXT DEFAULT 'weekly' CHECK (checkin_frequency IN (
    'daily', 'weekly', 'biweekly', 'monthly'
  )),
  last_checkin_at TIMESTAMPTZ,
  next_checkin_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kora_coaching_user_status
  ON public.kora_coaching_plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_kora_coaching_checkin_due
  ON public.kora_coaching_plans(next_checkin_at)
  WHERE status = 'active' AND next_checkin_at IS NOT NULL;

ALTER TABLE public.kora_coaching_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plans" ON public.kora_coaching_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own plan status" ON public.kora_coaching_plans
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- 5. kora_user_profile — perfil psicográfico
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kora_user_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  trait_planner REAL DEFAULT 0.5 CHECK (trait_planner BETWEEN 0 AND 1),
  trait_frugal REAL DEFAULT 0.5 CHECK (trait_frugal BETWEEN 0 AND 1),
  trait_risk_tolerant REAL DEFAULT 0.5 CHECK (trait_risk_tolerant BETWEEN 0 AND 1),
  trait_emotional_spender REAL DEFAULT 0.5 CHECK (trait_emotional_spender BETWEEN 0 AND 1),
  trait_social_oriented REAL DEFAULT 0.5 CHECK (trait_social_oriented BETWEEN 0 AND 1),

  prefers_direct_tone BOOLEAN DEFAULT TRUE,
  prefers_data_heavy BOOLEAN DEFAULT FALSE,
  prefers_emotional_support BOOLEAN DEFAULT FALSE,

  life_context JSONB DEFAULT '{}'::jsonb,
  spending_patterns JSONB DEFAULT '{}'::jsonb,

  profile_confidence REAL DEFAULT 0.1 CHECK (profile_confidence BETWEEN 0 AND 1),

  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interactions_analyzed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kora_user_profile_confidence
  ON public.kora_user_profile(profile_confidence);

ALTER TABLE public.kora_user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.kora_user_profile
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all profiles" ON public.kora_user_profile
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));


-- ==========================================================
-- 6. kora_usage_limits — contadores de rate limit
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kora_usage_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  opus_daily_count       INTEGER NOT NULL DEFAULT 0,
  opus_daily_date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  opus_monthly_count     INTEGER NOT NULL DEFAULT 0,
  opus_monthly_period    TEXT    NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),

  vision_monthly_count   INTEGER NOT NULL DEFAULT 0,
  vision_monthly_period  TEXT    NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kora_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON public.kora_usage_limits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all usage" ON public.kora_usage_limits
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.kora_usage_limits IS
  'Contadores de uso pra rate limits. Auto-reset de opus_daily quando date muda; opus_monthly/vision_monthly quando period muda. Lógica de reset fica na RPC kora_increment_usage (Fase 2).';


-- ==========================================================
-- 7. Helper set_updated_at()
-- ==========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kora_coaching_plans_updated_at ON public.kora_coaching_plans;
CREATE TRIGGER kora_coaching_plans_updated_at
  BEFORE UPDATE ON public.kora_coaching_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS kora_usage_limits_updated_at ON public.kora_usage_limits;
CREATE TRIGGER kora_usage_limits_updated_at
  BEFORE UPDATE ON public.kora_usage_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==========================================================
-- 8. TTL automático em kora_memory
-- ==========================================================
CREATE OR REPLACE FUNCTION public.kora_memory_set_expires()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := CASE NEW.memory_type
      WHEN 'conversation' THEN NOW() + INTERVAL '180 days'
      WHEN 'fact'         THEN NOW() + INTERVAL '365 days'
      WHEN 'preference'   THEN NOW() + INTERVAL '365 days'
      WHEN 'pattern'      THEN NOW() + INTERVAL '365 days'
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kora_memory_set_expires ON public.kora_memory;
CREATE TRIGGER kora_memory_set_expires
  BEFORE INSERT ON public.kora_memory
  FOR EACH ROW EXECUTE FUNCTION public.kora_memory_set_expires();


-- ==========================================================
-- 9. get_kora_context(user_id) — contexto consolidado
-- ==========================================================
CREATE OR REPLACE FUNCTION public.get_kora_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'memories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'type', memory_type,
        'content', content,
        'importance', importance
      ))
      FROM (
        SELECT memory_type, content, importance, created_at
        FROM public.kora_memory
        WHERE user_id = p_user_id
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY importance DESC, created_at DESC
        LIMIT 20
      ) m
    ), '[]'::jsonb),

    'profile', COALESCE((
      SELECT to_jsonb(p) - 'user_id' - 'last_updated_at'
      FROM public.kora_user_profile p
      WHERE p.user_id = p_user_id
    ), '{}'::jsonb),

    'active_plans', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'type', plan_type,
        'title', title,
        'progress', progress_percent,
        'next_checkin', next_checkin_at
      ))
      FROM public.kora_coaching_plans
      WHERE user_id = p_user_id AND status = 'active'
    ), '[]'::jsonb),

    'recent_interactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', created_at,
        'user_message', user_message,
        'kora_response', kora_response
      ))
      FROM (
        SELECT created_at, user_message, kora_response
        FROM public.kora_interactions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
      ) r
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;


-- ==========================================================
-- 10. kora_system_cost_today() — circuit breaker
-- Real-time (em vez de counter materializado). Partial index
-- idx_kora_interactions_cost_today mantém a query barata.
-- Migrar pra counter materializado só se p95 > 50ms.
-- ==========================================================
CREATE OR REPLACE FUNCTION public.kora_system_cost_today()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(cost_usd), 0)
  INTO total
  FROM public.kora_interactions
  WHERE created_at >= CURRENT_DATE
    AND cost_usd IS NOT NULL;
  RETURN total;
END;
$$;

COMMENT ON FUNCTION public.kora_system_cost_today() IS
  'Soma cost_usd do dia (UTC). Thresholds: >$50 degrade opus->sonnet, >$100 warn, >$150 throw (emergency passa com sonnet).';


-- ==========================================================
-- 11. delete_user_kora_data(user_id) — LGPD "Esquecer tudo"
-- Apaga memória/interações/ações/planos/usage; recria profile zerado.
-- Transações financeiras em public.transactions NÃO são afetadas
-- (são dado financeiro do usuário, não da Kora).
-- ==========================================================
CREATE OR REPLACE FUNCTION public.delete_user_kora_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  counts JSONB;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF caller <> p_user_id AND NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden: can only reset own Kora data';
  END IF;

  WITH
    d_memory       AS (DELETE FROM public.kora_memory         WHERE user_id = p_user_id RETURNING 1),
    d_interactions AS (DELETE FROM public.kora_interactions   WHERE user_id = p_user_id RETURNING 1),
    d_actions      AS (DELETE FROM public.kora_actions        WHERE user_id = p_user_id RETURNING 1),
    d_plans        AS (DELETE FROM public.kora_coaching_plans WHERE user_id = p_user_id RETURNING 1),
    d_usage        AS (DELETE FROM public.kora_usage_limits   WHERE user_id = p_user_id RETURNING 1)
  SELECT jsonb_build_object(
    'memories',     (SELECT COUNT(*) FROM d_memory),
    'interactions', (SELECT COUNT(*) FROM d_interactions),
    'actions',      (SELECT COUNT(*) FROM d_actions),
    'plans',        (SELECT COUNT(*) FROM d_plans),
    'usage_rows',   (SELECT COUNT(*) FROM d_usage)
  ) INTO counts;

  INSERT INTO public.kora_user_profile (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    trait_planner             = 0.5,
    trait_frugal              = 0.5,
    trait_risk_tolerant       = 0.5,
    trait_emotional_spender   = 0.5,
    trait_social_oriented     = 0.5,
    prefers_direct_tone       = TRUE,
    prefers_data_heavy        = FALSE,
    prefers_emotional_support = FALSE,
    life_context              = '{}'::jsonb,
    spending_patterns         = '{}'::jsonb,
    profile_confidence        = 0.1,
    interactions_analyzed     = 0,
    last_updated_at           = NOW();

  RETURN counts;
END;
$$;

COMMENT ON FUNCTION public.delete_user_kora_data(UUID) IS
  'LGPD "Esquecer tudo" da Kora. Apaga memória/interações/ações/planos/usage e recria profile zerado. Só próprio user ou admin.';


-- ==========================================================
-- 12. Estende handle_new_user() pra criar kora_user_profile
-- Mantém comportamento anterior (profiles + user_config) e adiciona
-- o novo INSERT. Trigger on_auth_user_created continua apontando pra ela.
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_config (user_id)
  VALUES (NEW.id);

  INSERT INTO public.kora_user_profile (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


-- ==========================================================
-- 13. COMMENT documentando status default (pedido explícito)
-- ==========================================================
COMMENT ON COLUMN public.kora_coaching_plans.status IS
  'Default ''active'' preserva retrocompatibilidade com código legado que insere sem especificar status. O Coach endpoint DEVE passar ''pending'' explicitamente quando criar plano que exige confirmação do usuário antes de ativar.';


-- ==========================================================
-- 14. Backfill idempotente pra usuários existentes
-- ==========================================================
INSERT INTO public.kora_user_profile (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.kora_usage_limits (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

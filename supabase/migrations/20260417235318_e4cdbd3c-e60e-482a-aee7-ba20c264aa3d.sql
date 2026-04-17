-- Fix bug crítico: ai_insights_cache.upsert(onConflict: 'user_id') falha porque não há UNIQUE em user_id.
-- Limpa duplicatas antes (se houver) mantendo o registro mais recente, depois adiciona constraint.
WITH ranked AS (
  SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY generated_at DESC NULLS LAST, id DESC) AS rn
  FROM public.ai_insights_cache
)
DELETE FROM public.ai_insights_cache
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.ai_insights_cache
  ADD CONSTRAINT ai_insights_cache_user_id_key UNIQUE (user_id);
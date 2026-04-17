
ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;

CREATE TABLE IF NOT EXISTS public.user_secrets (
  user_id uuid PRIMARY KEY,
  pluggy_connect_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own secrets" ON public.user_secrets;
CREATE POLICY "Users manage own secrets"
ON public.user_secrets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

INSERT INTO public.user_secrets (user_id, pluggy_connect_token)
SELECT user_id, pluggy_connect_token
FROM public.user_config
WHERE pluggy_connect_token IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET pluggy_connect_token = EXCLUDED.pluggy_connect_token;

ALTER TABLE public.user_config DROP COLUMN IF EXISTS pluggy_connect_token;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist with valid email"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 254
);

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

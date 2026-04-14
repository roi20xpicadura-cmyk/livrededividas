
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  platform_display_name text NOT NULL,
  method text CHECK (method IN ('ofx_import','webhook','api_key','oauth')),
  status text DEFAULT 'active' CHECK (status IN ('active','error','disconnected','pending')),
  webhook_url text,
  api_key_encrypted text,
  config jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  total_imported integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations"
  ON public.integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_integrations_user_platform ON public.integrations (user_id, platform);

CREATE TABLE public.integration_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform_name text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.integration_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own suggestions"
  ON public.integration_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

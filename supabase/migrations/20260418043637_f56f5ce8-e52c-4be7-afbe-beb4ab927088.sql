-- Tabela de idempotência para webhooks da Z-API
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_dedup (
  message_id TEXT PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_webhook_dedup ENABLE ROW LEVEL SECURITY;

-- Apenas service role acessa (webhook usa service key)
CREATE POLICY "Service role manages dedup"
ON public.whatsapp_webhook_dedup
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Index pra cleanup periódico
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_dedup_received_at
ON public.whatsapp_webhook_dedup(received_at);
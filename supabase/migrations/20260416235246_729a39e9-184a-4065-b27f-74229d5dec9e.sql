-- Add source column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'app';

-- Index whatsapp_connections phone_number for fast lookup
CREATE INDEX IF NOT EXISTS idx_wa_phone
  ON public.whatsapp_connections(phone_number);

-- Add role + content columns to whatsapp_messages (existing table uses direction/message)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS phone text;

CREATE INDEX IF NOT EXISTS idx_wamsg_phone
  ON public.whatsapp_messages(phone, created_at DESC);
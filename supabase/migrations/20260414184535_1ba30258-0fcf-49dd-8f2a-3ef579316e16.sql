
-- Bank connections table
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pluggy_item_id text NOT NULL,
  institution_name text NOT NULL,
  institution_logo text,
  institution_color text DEFAULT '#16a34a',
  account_type text,
  account_number text,
  account_name text,
  balance numeric(12,2) DEFAULT 0,
  available_balance numeric(12,2) DEFAULT 0,
  status text DEFAULT 'active',
  last_sync_at timestamptz,
  auto_import boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank_connections"
  ON public.bank_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Validation trigger for bank_connections
CREATE OR REPLACE FUNCTION public.validate_bank_connection_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_type IS NOT NULL AND NEW.account_type NOT IN ('BANK','CREDIT','INVESTMENT','DIGITAL_BANK') THEN
    RAISE EXCEPTION 'Invalid account_type: %', NEW.account_type;
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('active','syncing','error','disconnected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_bank_connection
  BEFORE INSERT OR UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.validate_bank_connection_fields();

-- Bank transactions raw table
CREATE TABLE IF NOT EXISTS public.bank_transactions_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  pluggy_transaction_id text UNIQUE NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  type text,
  category text,
  merchant_name text,
  imported boolean DEFAULT false,
  ignored boolean DEFAULT false,
  matched_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_transactions_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank_transactions_raw"
  ON public.bank_transactions_raw FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Validation trigger for bank_transactions_raw
CREATE OR REPLACE FUNCTION public.validate_bank_tx_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type IS NOT NULL AND NEW.type NOT IN ('CREDIT','DEBIT') THEN
    RAISE EXCEPTION 'Invalid type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_bank_tx_type
  BEFORE INSERT OR UPDATE ON public.bank_transactions_raw
  FOR EACH ROW EXECUTE FUNCTION public.validate_bank_tx_type();

-- Pluggy webhooks table
CREATE TABLE IF NOT EXISTS public.pluggy_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  item_id text,
  payload jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pluggy_webhooks ENABLE ROW LEVEL SECURITY;

-- Webhooks need to be insertable without auth (from Pluggy)
CREATE POLICY "Anyone can insert webhooks"
  ON public.pluggy_webhooks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read webhooks"
  ON public.pluggy_webhooks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  referrer text,
  position integer,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can count waitlist"
  ON public.waitlist FOR SELECT
  USING (true);

-- Auto-increment position trigger
CREATE OR REPLACE FUNCTION public.set_waitlist_position()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.position := (SELECT COALESCE(MAX(position), 0) + 1 FROM public.waitlist);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_waitlist_position
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_waitlist_position();

-- Add columns to user_config
ALTER TABLE public.user_config
  ADD COLUMN IF NOT EXISTS pluggy_connect_token text,
  ADD COLUMN IF NOT EXISTS bank_sync_enabled boolean DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_raw_connection ON public.bank_transactions_raw(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_raw_user ON public.bank_transactions_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_raw_pending ON public.bank_transactions_raw(user_id, imported, ignored) WHERE imported = false AND ignored = false;
CREATE INDEX IF NOT EXISTS idx_pluggy_webhooks_item ON public.pluggy_webhooks(item_id);

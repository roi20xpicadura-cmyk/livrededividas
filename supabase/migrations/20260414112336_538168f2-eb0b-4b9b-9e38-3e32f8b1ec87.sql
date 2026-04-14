
-- Add missing columns to credit_cards
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS closing_day integer,
  ADD COLUMN IF NOT EXISTS network text DEFAULT 'visa',
  ADD COLUMN IF NOT EXISTS last_four text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Create card_bills table
CREATE TABLE IF NOT EXISTS public.card_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  total_amount numeric(12,2) DEFAULT 0,
  paid boolean DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(card_id, month_year)
);

-- Enable RLS
ALTER TABLE public.card_bills ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users manage own card bills" ON public.card_bills
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Validation trigger for network
CREATE OR REPLACE FUNCTION public.validate_card_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.network IS NOT NULL AND NEW.network NOT IN ('visa','mastercard','elo','amex','hipercard','other') THEN
    RAISE EXCEPTION 'Invalid network: %', NEW.network;
  END IF;
  IF NEW.closing_day IS NOT NULL AND (NEW.closing_day < 1 OR NEW.closing_day > 31) THEN
    RAISE EXCEPTION 'closing_day must be between 1 and 31';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_card_fields_trigger
  BEFORE INSERT OR UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.validate_card_fields();

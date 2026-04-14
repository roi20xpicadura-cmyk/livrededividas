
-- Create debts table
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  creditor text NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  remaining_amount numeric(12,2) NOT NULL,
  interest_rate numeric(6,2) DEFAULT 0,
  min_payment numeric(12,2) DEFAULT 0,
  due_day integer,
  debt_type text NOT NULL,
  priority integer DEFAULT 0,
  status text DEFAULT 'active',
  strategy text DEFAULT 'snowball',
  color text DEFAULT '#dc2626',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create debt_payments table
CREATE TABLE public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for debts
CREATE POLICY "Users manage own debts" ON public.debts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for debt_payments
CREATE POLICY "Users manage own debt payments" ON public.debt_payments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add validation trigger for debt_type
CREATE OR REPLACE FUNCTION public.validate_debt_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.debt_type NOT IN ('credit_card','personal_loan','bank_loan','overdraft','friend_family','store_credit','medical','tax','other') THEN
    RAISE EXCEPTION 'Invalid debt_type: %', NEW.debt_type;
  END IF;
  IF NEW.status NOT IN ('active','paused','paid') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.strategy NOT IN ('snowball','avalanche','custom') THEN
    RAISE EXCEPTION 'Invalid strategy: %', NEW.strategy;
  END IF;
  IF NEW.due_day IS NOT NULL AND (NEW.due_day < 1 OR NEW.due_day > 31) THEN
    RAISE EXCEPTION 'due_day must be between 1 and 31';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_debt_fields_trigger
  BEFORE INSERT OR UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.validate_debt_fields();

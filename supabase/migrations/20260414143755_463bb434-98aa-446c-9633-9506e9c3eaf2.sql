
-- Link transactions to credit cards + soft delete
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES credit_cards(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Soft delete on goals and debts
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Extra user_config columns
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS last_period text DEFAULT 'month';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS notification_push_token text;

-- Scheduled bills
CREATE TABLE IF NOT EXISTS scheduled_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  category text NOT NULL,
  origin text DEFAULT 'personal',
  card_id uuid REFERENCES credit_cards(id),
  recurrent boolean DEFAULT false,
  frequency text,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled_bills"
  ON scheduled_bills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goal deposits
CREATE TABLE IF NOT EXISTS goal_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  deposit_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goal_deposits"
  ON goal_deposits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Investment history
CREATE TABLE IF NOT EXISTS investment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  investment_id uuid REFERENCES investments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE investment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own investment_history"
  ON investment_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Monthly reports
CREATE TABLE IF NOT EXISTS monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_year text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  data jsonb,
  UNIQUE(user_id, month_year)
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monthly_reports"
  ON monthly_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_scheduled_bill_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending','paid','overdue','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.frequency IS NOT NULL AND NEW.frequency NOT IN ('weekly','monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency;
  END IF;
  IF NEW.origin IS NOT NULL AND NEW.origin NOT IN ('personal','business') THEN
    RAISE EXCEPTION 'Invalid origin: %', NEW.origin;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_scheduled_bill
  BEFORE INSERT OR UPDATE ON scheduled_bills
  FOR EACH ROW EXECUTE FUNCTION public.validate_scheduled_bill_fields();

CREATE OR REPLACE FUNCTION public.validate_investment_history_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.event_type NOT IN ('deposit','withdrawal','update') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_investment_history
  BEFORE INSERT OR UPDATE ON investment_history
  FOR EACH ROW EXECUTE FUNCTION public.validate_investment_history_fields();

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

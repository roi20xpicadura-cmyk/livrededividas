
-- Add new columns to user_config
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS debt_strategy text DEFAULT 'snowball';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS financial_score integer DEFAULT 0;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS last_activity_date date;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS xp_points integer DEFAULT 0;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS level text DEFAULT 'iniciante';

-- Recurring transactions
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  type text NOT NULL,
  origin text NOT NULL,
  category text NOT NULL,
  frequency text NOT NULL,
  day_of_month integer,
  next_date date NOT NULL,
  active boolean DEFAULT true,
  last_created date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring" ON recurring_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Validation trigger for recurring_transactions
CREATE OR REPLACE FUNCTION public.validate_recurring_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('income','expense') THEN RAISE EXCEPTION 'Invalid type: %', NEW.type; END IF;
  IF NEW.origin NOT IN ('business','personal') THEN RAISE EXCEPTION 'Invalid origin: %', NEW.origin; END IF;
  IF NEW.frequency NOT IN ('weekly','monthly','yearly') THEN RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency; END IF;
  IF NEW.day_of_month IS NOT NULL AND (NEW.day_of_month < 1 OR NEW.day_of_month > 31) THEN RAISE EXCEPTION 'day_of_month must be 1-31'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_recurring_fields_trigger BEFORE INSERT OR UPDATE ON recurring_transactions FOR EACH ROW EXECUTE FUNCTION validate_recurring_fields();

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  month_year text NOT NULL,
  limit_amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category, month_year)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievements" ON achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_email text NOT NULL,
  status text DEFAULT 'pending',
  reward_granted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own referrals" ON referrals FOR ALL USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);

-- Validation trigger for referrals
CREATE OR REPLACE FUNCTION public.validate_referral_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending','registered','subscribed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_referral_status_trigger BEFORE INSERT OR UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION validate_referral_status();

-- AI insights cache
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  insights jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insights" ON ai_insights_cache FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  weekly_summary boolean DEFAULT true,
  goal_alerts boolean DEFAULT true,
  card_due_alerts boolean DEFAULT true,
  budget_alerts boolean DEFAULT true,
  streak_alerts boolean DEFAULT true,
  debt_reminders boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notif prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(NEW.user_id::text) for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code BEFORE INSERT ON user_config FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

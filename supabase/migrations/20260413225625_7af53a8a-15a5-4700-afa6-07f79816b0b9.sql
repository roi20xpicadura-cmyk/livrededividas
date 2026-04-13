
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  plan text DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  plan_expires_at timestamptz,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income','expense')),
  origin text NOT NULL CHECK (origin IN ('business','personal')),
  category text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create goals table
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  target_amount numeric(12,2) NOT NULL,
  current_amount numeric(12,2) DEFAULT 0,
  start_date date,
  deadline date,
  color text DEFAULT '#16a34a',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  credit_limit numeric(12,2) NOT NULL,
  used_amount numeric(12,2) DEFAULT 0,
  due_day integer CHECK (due_day BETWEEN 1 AND 31),
  color text DEFAULT '#16a34a',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cards" ON public.credit_cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create investments table
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date,
  name text NOT NULL,
  invested_amount numeric(12,2) NOT NULL,
  current_amount numeric(12,2) NOT NULL,
  asset_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own investments" ON public.investments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  plan text NOT NULL,
  status text NOT NULL CHECK (status IN ('active','cancelled','past_due','trialing')),
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create user_config table
CREATE TABLE public.user_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  currency text DEFAULT 'R$',
  project_name text DEFAULT 'Meu Painel',
  default_save_pct numeric(5,2) DEFAULT 25,
  theme text DEFAULT 'light',
  notifications_enabled boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own config" ON public.user_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create trigger function to auto-create profile and config on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_config (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

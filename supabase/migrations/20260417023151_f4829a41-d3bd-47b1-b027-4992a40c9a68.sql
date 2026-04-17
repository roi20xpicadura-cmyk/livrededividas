
-- Allow 'business' as valid plan and set admin account to business
-- Temporarily disable the plan escalation trigger to seed admin
ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles
SET plan = 'business'
WHERE id = (SELECT id FROM auth.users WHERE email = '528siqueira@gmail.com');

ALTER TABLE public.profiles ENABLE TRIGGER USER;

-- Add CHECK constraint for plan values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('free', 'pro', 'business'));
  END IF;
END $$;

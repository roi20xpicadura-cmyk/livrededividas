
-- Add profile type and objectives to user_config
ALTER TABLE public.user_config 
  ADD COLUMN IF NOT EXISTS profile_type text DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS financial_objectives text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- Add objective_type and is_highlighted to goals
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS objective_type text DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS is_highlighted boolean DEFAULT false;

-- Add validation trigger for profile_type
CREATE OR REPLACE FUNCTION public.validate_profile_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_type NOT IN ('personal', 'business', 'both') THEN
    RAISE EXCEPTION 'Invalid profile_type: %', NEW.profile_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_user_config_profile_type
  BEFORE INSERT OR UPDATE ON public.user_config
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_type();

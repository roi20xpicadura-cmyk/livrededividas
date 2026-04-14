
CREATE TABLE public.prediction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  predictions jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  horizon_days integer DEFAULT 90,
  UNIQUE(user_id)
);

ALTER TABLE public.prediction_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prediction_cache"
ON public.prediction_cache FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.prediction_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'info',
  triggered_date date NOT NULL,
  dismissed boolean DEFAULT false,
  action_taken boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.prediction_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prediction_alerts"
ON public.prediction_alerts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Validation trigger for severity
CREATE OR REPLACE FUNCTION public.validate_prediction_alert_severity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity NOT IN ('danger','warning','info','success') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_prediction_alert_severity_trigger
BEFORE INSERT OR UPDATE ON public.prediction_alerts
FOR EACH ROW EXECUTE FUNCTION public.validate_prediction_alert_severity();

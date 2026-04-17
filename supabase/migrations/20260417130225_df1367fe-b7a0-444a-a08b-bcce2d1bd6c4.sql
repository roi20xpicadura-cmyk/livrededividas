UPDATE public.profiles 
SET plan = 'pro', 
    plan_expires_at = (now() + interval '1 month')
WHERE id = '2295121b-e489-46da-9b4e-2868dab18a9d';
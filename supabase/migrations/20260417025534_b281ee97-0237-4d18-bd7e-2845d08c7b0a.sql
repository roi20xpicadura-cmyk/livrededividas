CREATE OR REPLACE FUNCTION public.get_monthly_balances(p_user_id uuid)
RETURNS TABLE(month text, balance numeric)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', date::date), 'YYYY-MM') as month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)::numeric as balance
  FROM public.transactions
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
  GROUP BY date_trunc('month', date::date)
  ORDER BY date_trunc('month', date::date) DESC
  LIMIT 6;
$$;
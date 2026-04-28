
-- Revoke EXECUTE on internal SECURITY DEFINER functions from anon and authenticated.
-- These are trigger functions or queue helpers that should NOT be callable from the client.

-- Trigger functions (internal — only invoked by triggers)
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_recurring_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_referral_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_scheduled_bill_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_investment_history_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_debt_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_card_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_detected_subscriptions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_waitlist_position() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_bank_connection_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_bank_tx_type() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_prediction_alert_severity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_gamification_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_plan_escalation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_type() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kora_memory_set_expires() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_whatsapp_message_direction() FROM anon, authenticated;

-- Email queue helpers (called only from edge functions with service_role)
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon;
-- enqueue_email kept for authenticated (in case of client use); revoke if confirmed server-only later.

-- Keep EXECUTE for client-callable functions (no changes needed):
--   has_role, get_kora_context, get_monthly_balances,
--   kora_system_cost_today, delete_user_kora_data

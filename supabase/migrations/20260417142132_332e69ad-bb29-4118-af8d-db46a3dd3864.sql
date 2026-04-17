INSERT INTO storage.buckets (id, name, public) VALUES ('wpp-reports', 'wpp-reports', false) ON CONFLICT (id) DO NOTHING;

-- Service role manages all (used by edge functions). Users can read their own files via signed URLs only.
CREATE POLICY "Service role manages wpp-reports"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'wpp-reports' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'wpp-reports' AND auth.role() = 'service_role');
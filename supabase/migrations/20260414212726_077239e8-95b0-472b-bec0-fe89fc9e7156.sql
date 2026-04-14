-- Fix storage: restrict avatar listing to own folder only
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));
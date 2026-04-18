
-- Drop the overly broad public SELECT policy
DROP POLICY "Anyone can view evidence photos" ON storage.objects;

-- Allow authenticated users to view evidence photos
CREATE POLICY "Authenticated users can view evidence photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'evidence-photos');

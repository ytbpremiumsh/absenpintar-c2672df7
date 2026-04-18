-- Create public storage bucket for announcement attachments/images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-attachments', 'announcement-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public can view announcement attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-attachments');

-- Authenticated users (school admins) can upload to their school folder
CREATE POLICY "Authenticated can upload announcement attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'announcement-attachments');

CREATE POLICY "Authenticated can update announcement attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'announcement-attachments');

CREATE POLICY "Authenticated can delete announcement attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'announcement-attachments');
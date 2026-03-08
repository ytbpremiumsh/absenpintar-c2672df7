
-- Add image_url column to ticket_replies
ALTER TABLE public.ticket_replies ADD COLUMN image_url text;

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true);

-- Allow authenticated users to upload to ticket-attachments
CREATE POLICY "Authenticated users upload ticket attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow anyone to view ticket attachments
CREATE POLICY "Anyone can view ticket attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');

-- Enable realtime for ticket_replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_replies;


-- Insert presentation settings into platform_settings
INSERT INTO public.platform_settings (key, value) VALUES 
  ('presentation_is_public', 'false'),
  ('presentation_title', 'Smart Pickup School System'),
  ('presentation_subtitle', 'Sistem Penjemputan Siswa Modern, Aman & Terorganisir')
ON CONFLICT (key) DO NOTHING;


INSERT INTO public.platform_settings (key, value) VALUES
  ('presentation_is_public', 'true'),
  ('presentation_title', 'Smart Pickup School System'),
  ('presentation_subtitle', 'Sistem absensi & penjemputan siswa modern yang mengutamakan keamanan, efisiensi, dan transparansi untuk sekolah Indonesia.')
ON CONFLICT (key) DO NOTHING;

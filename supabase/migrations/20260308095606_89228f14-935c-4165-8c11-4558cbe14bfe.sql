INSERT INTO public.landing_content (key, value, type) VALUES
  ('feature_5_title', 'Manajemen Kelas', 'text'),
  ('feature_5_desc', 'Kelola data kelas dan siswa dengan mudah dalam satu platform terpadu', 'text'),
  ('feature_5_icon', 'monitor', 'text'),
  ('feature_6_title', 'Keamanan Data', 'text'),
  ('feature_6_desc', 'Data siswa dan sekolah terlindungi dengan sistem keamanan berlapis', 'text'),
  ('feature_6_icon', 'chart', 'text')
ON CONFLICT (key) DO NOTHING;
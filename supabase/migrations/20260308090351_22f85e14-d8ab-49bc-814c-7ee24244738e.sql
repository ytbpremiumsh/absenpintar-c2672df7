
-- Landing page content table (key-value store for dynamic content)
CREATE TABLE public.landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text', -- text, image, json
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read landing content (public page)
CREATE POLICY "Anyone can view landing content"
  ON public.landing_content FOR SELECT
  USING (true);

-- Only super admins can manage
CREATE POLICY "Super admins manage landing content"
  ON public.landing_content FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Seed default content
INSERT INTO public.landing_content (key, value, type) VALUES
  ('hero_title', 'Smart Pickup School', 'text'),
  ('hero_subtitle', 'Sistem penjemputan siswa digital yang aman, cepat, dan transparan untuk sekolah modern.', 'text'),
  ('hero_image', '', 'image'),
  ('feature_1_title', 'QR Code Scan', 'text'),
  ('feature_1_desc', 'Setiap siswa memiliki QR Code unik untuk proses penjemputan yang cepat dan aman.', 'text'),
  ('feature_1_icon', 'scan', 'text'),
  ('feature_2_title', 'Live Monitoring', 'text'),
  ('feature_2_desc', 'Pantau status penjemputan siswa secara real-time dari mana saja.', 'text'),
  ('feature_2_icon', 'monitor', 'text'),
  ('feature_3_title', 'Notifikasi WhatsApp', 'text'),
  ('feature_3_desc', 'Orang tua mendapat notifikasi otomatis saat anak dijemput melalui WhatsApp.', 'text'),
  ('feature_3_icon', 'message', 'text'),
  ('feature_4_title', 'Laporan & Riwayat', 'text'),
  ('feature_4_desc', 'Rekap data penjemputan harian lengkap yang bisa diekspor ke Excel atau PDF.', 'text'),
  ('feature_4_icon', 'chart', 'text'),
  ('footer_logo', '', 'image'),
  ('footer_address', 'Jl. Pendidikan No. 1, Indonesia', 'text'),
  ('footer_email', 'info@smartpickup.id', 'text'),
  ('footer_phone', '+62 812 3456 7890', 'text'),
  ('cta_text', 'Mulai Gunakan Sekarang', 'text');

-- Create storage bucket for landing images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-assets', 'landing-assets', true);

CREATE POLICY "Anyone can view landing assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'landing-assets');

CREATE POLICY "Super admins upload landing assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'landing-assets' AND has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins delete landing assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'landing-assets' AND has_role(auth.uid(), 'super_admin'));

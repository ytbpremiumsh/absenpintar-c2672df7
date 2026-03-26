
CREATE TABLE public.promo_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read promo_content" ON public.promo_content FOR SELECT USING (true);

CREATE POLICY "Super admins can manage promo_content" ON public.promo_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.promo_content (key, value, type) VALUES
('hero_title', 'Solusi Absensi Digital Terbaik untuk Sekolah Anda', 'text'),
('hero_subtitle', 'ATSkolla menghadirkan sistem absensi modern berbasis QR Code, Face Recognition, dan notifikasi WhatsApp otomatis. Hemat waktu, tingkatkan transparansi, dan kelola kehadiran siswa dengan mudah.', 'text'),
('hero_cta_text', 'Mulai Gratis Sekarang', 'text'),
('hero_cta_link', '/register', 'text'),
('section_why_title', 'Mengapa Sekolah Memilih ATSkolla?', 'text'),
('section_pricing_title', 'Paket Harga Terjangkau', 'text'),
('section_pricing_subtitle', 'Pilih paket yang sesuai dengan kebutuhan sekolah Anda', 'text'),
('promo_banner_text', 'PROMO SPESIAL: Diskon 20% untuk pendaftaran bulan ini!', 'text'),
('promo_banner_active', 'true', 'boolean'),
('contact_whatsapp', '6281234567890', 'text'),
('contact_email', 'info@atskolla.com', 'text');

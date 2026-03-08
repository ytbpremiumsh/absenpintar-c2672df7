
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage platform settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.platform_settings (key, value) VALUES
  ('wa_registration_enabled', 'false'),
  ('wa_api_url', 'http://proxy.onesender.net/api/v1/messages'),
  ('wa_api_key', ''),
  ('wa_registration_message', 'Halo {name}! 👋\n\nSelamat datang di Smart Pickup School! 🎉\nAkun sekolah *{school}* telah berhasil didaftarkan.\n\nSilakan login di aplikasi untuk mulai menggunakan sistem penjemputan digital.\n\nTerima kasih! 🙏');

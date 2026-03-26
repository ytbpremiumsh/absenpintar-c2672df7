
CREATE TABLE public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  phone text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.password_reset_otps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_otp ON public.password_reset_otps(otp_code);

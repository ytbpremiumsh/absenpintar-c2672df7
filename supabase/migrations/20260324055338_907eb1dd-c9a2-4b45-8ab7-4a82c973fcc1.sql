
-- Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS current_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_points INTEGER NOT NULL DEFAULT 0;

-- Generate referral codes for existing profiles
UPDATE public.profiles SET referral_code = 'ATS-' || upper(substr(md5(random()::text), 1, 6)) WHERE referral_code IS NULL;

-- Referrals tracking table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());
CREATE POLICY "Super admins manage referrals" ON public.referrals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Point transactions table
CREATE TABLE public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own point transactions" ON public.point_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Super admins manage point transactions" ON public.point_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Rewards catalog table
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards" ON public.rewards FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "Super admins manage rewards" ON public.rewards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Reward claims table
CREATE TABLE public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  points_used INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reward claims" ON public.reward_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Super admins manage reward claims" ON public.reward_claims FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Referral settings (platform-level config for point values, campaigns, etc.)
INSERT INTO public.platform_settings (key, value) VALUES
  ('referral_points_register', '10'),
  ('referral_points_trial', '20'),
  ('referral_points_paid', '100'),
  ('referral_double_points', 'false')
ON CONFLICT DO NOTHING;

-- Seed default rewards
INSERT INTO public.rewards (name, description, points_required, duration_days, sort_order) VALUES
  ('Diskon 50% 1 Bulan', 'Potongan 50% untuk langganan 1 bulan', 100, 15, 1),
  ('Gratis 1 Bulan', 'Perpanjangan langganan gratis 1 bulan', 200, 30, 2),
  ('Gratis 3 Bulan', 'Perpanjangan langganan gratis 3 bulan', 400, 90, 3),
  ('Gratis 6 Bulan', 'Perpanjangan langganan gratis 6 bulan', 700, 180, 4);

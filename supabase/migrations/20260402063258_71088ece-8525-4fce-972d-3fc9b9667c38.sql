
-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text,
  affiliate_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  commission_rate numeric(5,2) NOT NULL DEFAULT 50.00,
  current_balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_withdrawn integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all affiliates"
  ON public.affiliates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anon can read affiliates by code"
  ON public.affiliates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read affiliates by code"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (true);

-- Affiliate commissions table
CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id),
  plan_name text NOT NULL,
  plan_price integer NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all commissions"
  ON public.affiliate_commissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Affiliate withdrawals table
CREATE TABLE public.affiliate_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all withdrawals"
  ON public.affiliate_withdrawals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Index for fast lookup
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_withdrawals_affiliate ON public.affiliate_withdrawals(affiliate_id);

-- Trigger for updated_at
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

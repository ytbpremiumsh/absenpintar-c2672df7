-- Add user_id link to affiliates (for internal teacher affiliates)
ALTER TABLE public.affiliates 
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_user_id_unique_idx 
  ON public.affiliates(user_id) WHERE user_id IS NOT NULL;

-- Add ewallet support and estimated payout date to withdrawals
ALTER TABLE public.affiliate_withdrawals
  ADD COLUMN IF NOT EXISTS ewallet_type text,
  ADD COLUMN IF NOT EXISTS estimated_payout_at timestamp with time zone;

-- Track first-payment-only commissions
ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS is_first_payment boolean NOT NULL DEFAULT true;

-- Prevent duplicate commission per school (only first paid subscription generates commission)
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_commissions_school_unique_idx 
  ON public.affiliate_commissions(school_id) WHERE school_id IS NOT NULL;

-- RLS: Authenticated users can view their own linked affiliate row
CREATE POLICY "Users view own linked affiliate"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: Authenticated users can insert their own affiliate row (auto-enroll)
CREATE POLICY "Users create own linked affiliate"
  ON public.affiliates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: Authenticated users can update their own affiliate row (profile, custom code)
CREATE POLICY "Users update own linked affiliate"
  ON public.affiliates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Users can view their own commissions
CREATE POLICY "Users view own commissions"
  ON public.affiliate_commissions FOR SELECT
  TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- RLS: Users can view their own withdrawals
CREATE POLICY "Users view own withdrawals"
  ON public.affiliate_withdrawals FOR SELECT
  TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- RLS: Users can create withdrawal requests for their own affiliate
CREATE POLICY "Users create own withdrawals"
  ON public.affiliate_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE TABLE public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies on their school's tickets
CREATE POLICY "Users view ticket replies"
  ON public.ticket_replies FOR SELECT TO authenticated
  USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE school_id = get_user_school_id(auth.uid()))
  );

-- Users can insert replies on their school's tickets (only if ticket not resolved)
CREATE POLICY "Users create ticket replies"
  ON public.ticket_replies FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE school_id = get_user_school_id(auth.uid()) AND status != 'resolved')
  );

-- Super admins full access
CREATE POLICY "Super admins manage ticket replies"
  ON public.ticket_replies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

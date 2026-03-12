
CREATE TABLE public.wa_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  phone text,
  group_id text,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'attendance',
  status text NOT NULL DEFAULT 'sent',
  student_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view school wa logs" ON public.wa_message_logs
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins manage wa logs" ON public.wa_message_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

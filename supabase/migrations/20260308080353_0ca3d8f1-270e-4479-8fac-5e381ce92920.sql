
CREATE TABLE public.qr_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  instruction_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qr_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view school qr instructions" ON public.qr_instructions
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "School admins manage qr instructions" ON public.qr_instructions
  FOR ALL TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin')))
  WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin')));

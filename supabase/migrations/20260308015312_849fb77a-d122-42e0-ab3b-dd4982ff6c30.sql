
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view school classes" ON public.classes
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "School admins manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin'))
  );

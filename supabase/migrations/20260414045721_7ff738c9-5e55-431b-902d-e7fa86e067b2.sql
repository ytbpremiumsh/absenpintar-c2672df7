
-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view school subjects" ON public.subjects FOR SELECT USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "School admins manage subjects" ON public.subjects FOR ALL USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin'))) WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin')));
CREATE POLICY "Super admins manage all subjects" ON public.subjects FOR ALL USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Teaching schedules table
CREATE TABLE public.teaching_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teaching_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view school schedules" ON public.teaching_schedules FOR SELECT USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Teachers view own schedules" ON public.teaching_schedules FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "School admins manage schedules" ON public.teaching_schedules FOR ALL USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin'))) WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'super_admin')));
CREATE POLICY "Super admins manage all schedules" ON public.teaching_schedules FOR ALL USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_teaching_schedules_school ON public.teaching_schedules(school_id);
CREATE INDEX idx_teaching_schedules_teacher ON public.teaching_schedules(teacher_id);
CREATE INDEX idx_teaching_schedules_day ON public.teaching_schedules(day_of_week);

CREATE TRIGGER update_teaching_schedules_updated_at BEFORE UPDATE ON public.teaching_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

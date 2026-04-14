
-- Subject-specific attendance by teachers (separate from main attendance)
CREATE TABLE public.subject_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teaching_schedule_id UUID NOT NULL REFERENCES public.teaching_schedules(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'hadir',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, teaching_schedule_id, date)
);

ALTER TABLE public.subject_attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can insert their own subject attendance
CREATE POLICY "Teachers insert own subject attendance"
ON public.subject_attendance
FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid() AND school_id = get_user_school_id(auth.uid()));

-- Teachers can view their own subject attendance
CREATE POLICY "Teachers view own subject attendance"
ON public.subject_attendance
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Teachers can update their own subject attendance
CREATE POLICY "Teachers update own subject attendance"
ON public.subject_attendance
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid());

-- School admins can view all subject attendance in their school
CREATE POLICY "School admins view school subject attendance"
ON public.subject_attendance
FOR SELECT
TO authenticated
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'school_admin'));

-- Super admins manage all
CREATE POLICY "Super admins manage all subject attendance"
ON public.subject_attendance
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Index for common queries
CREATE INDEX idx_subject_attendance_teacher_date ON public.subject_attendance(teacher_id, date);
CREATE INDEX idx_subject_attendance_schedule_date ON public.subject_attendance(teaching_schedule_id, date);

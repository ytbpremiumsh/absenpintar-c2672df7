
-- Create attendance_logs table
CREATE TABLE public.attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  method TEXT NOT NULL DEFAULT 'barcode',
  status TEXT NOT NULL DEFAULT 'hadir',
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view school attendance" ON public.attendance_logs
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Staff create attendance" ON public.attendance_logs
  FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Staff update attendance" ON public.attendance_logs
  FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Staff delete attendance" ON public.attendance_logs
  FOR DELETE TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins manage all attendance" ON public.attendance_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Enable realtime for attendance_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;

-- Create index for faster queries
CREATE INDEX idx_attendance_logs_school_date ON public.attendance_logs(school_id, date);
CREATE INDEX idx_attendance_logs_student ON public.attendance_logs(student_id, date);

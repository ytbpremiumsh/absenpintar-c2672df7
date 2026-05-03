
-- Parent OTP store
CREATE TABLE public.parent_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parent_otps_phone ON public.parent_otps(phone);
ALTER TABLE public.parent_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only otps" ON public.parent_otps FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Parent sessions
CREATE TABLE public.parent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  phone text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parent_sessions_token ON public.parent_sessions(token);
CREATE INDEX idx_parent_sessions_phone ON public.parent_sessions(phone);
ALTER TABLE public.parent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only sessions" ON public.parent_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Leave requests (Izin / Sakit) submitted by parents
CREATE TABLE public.parent_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  parent_phone text NOT NULL,
  type text NOT NULL CHECK (type IN ('izin','sakit')),
  date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leave_school ON public.parent_leave_requests(school_id, status);
CREATE INDEX idx_leave_student ON public.parent_leave_requests(student_id);
ALTER TABLE public.parent_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School users view leave requests" ON public.parent_leave_requests
  FOR SELECT TO authenticated USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "School staff update leave requests" ON public.parent_leave_requests
  FOR UPDATE TO authenticated USING (school_id = get_user_school_id(auth.uid()))
  WITH CHECK (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Super admin manage leave requests" ON public.parent_leave_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Messages between parent and class teacher
CREATE TABLE public.parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  parent_phone text NOT NULL,
  teacher_user_id uuid,
  sender_type text NOT NULL CHECK (sender_type IN ('parent','teacher')),
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pmsg_school ON public.parent_messages(school_id, student_id);
CREATE INDEX idx_pmsg_phone ON public.parent_messages(parent_phone);
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School users view messages" ON public.parent_messages
  FOR SELECT TO authenticated USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "School staff write messages" ON public.parent_messages
  FOR INSERT TO authenticated WITH CHECK (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "School staff update messages" ON public.parent_messages
  FOR UPDATE TO authenticated USING (school_id = get_user_school_id(auth.uid()))
  WITH CHECK (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Super admin manage messages" ON public.parent_messages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Student grades (raport)
CREATE TABLE public.student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject text NOT NULL,
  semester text NOT NULL,
  school_year text NOT NULL,
  term text NOT NULL DEFAULT 'akhir',
  score numeric NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_grade_student ON public.student_grades(student_id, school_year, semester);
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School users view grades" ON public.student_grades
  FOR SELECT TO authenticated USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "School staff manage grades" ON public.student_grades
  FOR ALL TO authenticated USING (school_id = get_user_school_id(auth.uid()))
  WITH CHECK (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Super admin manage grades" ON public.student_grades
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));


-- Fix students RLS: make SELECT permissive so school users can view
DROP POLICY IF EXISTS "Users view school students" ON public.students;
CREATE POLICY "Users view school students" ON public.students
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

-- Fix school_admins policy to be permissive too  
DROP POLICY IF EXISTS "School admins manage students" ON public.students;
CREATE POLICY "School admins manage students" ON public.students
  FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid()) 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

-- Fix pickup_logs RLS
DROP POLICY IF EXISTS "Users view school pickup logs" ON public.pickup_logs;
CREATE POLICY "Users view school pickup logs" ON public.pickup_logs
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Staff create pickup logs" ON public.pickup_logs;
CREATE POLICY "Staff create pickup logs" ON public.pickup_logs
  FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id(auth.uid()));

-- Fix profiles RLS
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins view all profiles" ON public.profiles;
CREATE POLICY "Super admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "School admins view school profiles" ON public.profiles;
CREATE POLICY "School admins view school profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'school_admin'::app_role));

-- Fix schools RLS
DROP POLICY IF EXISTS "Users view own school" ON public.schools;
CREATE POLICY "Users view own school" ON public.schools
  FOR SELECT TO authenticated
  USING (id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage all schools" ON public.schools;
CREATE POLICY "Super admins manage all schools" ON public.schools
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles RLS
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins manage roles" ON public.user_roles;
CREATE POLICY "Super admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Enable realtime for pickup_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_logs;

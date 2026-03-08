
-- Fix ALL RLS policies to be PERMISSIVE (default) instead of RESTRICTIVE

-- STUDENTS
DROP POLICY IF EXISTS "Users view school students" ON public.students;
DROP POLICY IF EXISTS "School admins manage students" ON public.students;

CREATE POLICY "Users view school students" ON public.students
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "School admins manage students" ON public.students
  FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid()) 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid()) 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

-- PICKUP_LOGS
DROP POLICY IF EXISTS "Users view school pickup logs" ON public.pickup_logs;
DROP POLICY IF EXISTS "Staff create pickup logs" ON public.pickup_logs;

CREATE POLICY "Users view school pickup logs" ON public.pickup_logs
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Staff create pickup logs" ON public.pickup_logs
  FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id(auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "School admins view school profiles" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "School admins view school profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'school_admin'::app_role));

-- SCHOOLS
DROP POLICY IF EXISTS "Users view own school" ON public.schools;
DROP POLICY IF EXISTS "Super admins manage all schools" ON public.schools;

CREATE POLICY "Users view own school" ON public.schools
  FOR SELECT TO authenticated
  USING (id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins manage all schools" ON public.schools
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- USER_ROLES
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add handle_new_user trigger (missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

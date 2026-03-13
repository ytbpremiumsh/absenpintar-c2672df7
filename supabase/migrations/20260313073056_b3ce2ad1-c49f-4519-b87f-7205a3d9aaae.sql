-- Add INSERT policy for school_integrations allowing staff to create for their school
CREATE POLICY "Staff create school integrations"
ON public.school_integrations
FOR INSERT
TO authenticated
WITH CHECK (school_id = get_user_school_id(auth.uid()));

-- Also add UPDATE policy for staff (not just school_admin)
CREATE POLICY "Staff update own school integrations"
ON public.school_integrations
FOR UPDATE
TO authenticated
USING (school_id = get_user_school_id(auth.uid()))
WITH CHECK (school_id = get_user_school_id(auth.uid()));

-- Add SELECT policy for staff to view their school integrations
CREATE POLICY "Staff view own school integrations"
ON public.school_integrations
FOR SELECT
TO authenticated
USING (school_id = get_user_school_id(auth.uid()));
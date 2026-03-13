
-- Add UPDATE policy for staff to update students in their school
CREATE POLICY "Staff update school students"
ON public.students FOR UPDATE
TO authenticated
USING (school_id = get_user_school_id(auth.uid()))
WITH CHECK (school_id = get_user_school_id(auth.uid()));

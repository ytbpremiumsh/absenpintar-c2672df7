-- Allow school admins to update their own school
CREATE POLICY "School admins update own school"
ON public.schools
FOR UPDATE
TO authenticated
USING (id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'school_admin'::app_role))
WITH CHECK (id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'school_admin'::app_role));

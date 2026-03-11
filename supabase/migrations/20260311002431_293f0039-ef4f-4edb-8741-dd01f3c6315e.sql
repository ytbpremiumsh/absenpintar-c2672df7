
CREATE POLICY "School admins view school user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.school_id = get_user_school_id(auth.uid())
  )
  AND has_role(auth.uid(), 'school_admin'::app_role)
);

-- Allow school admins to insert roles for users in their school
CREATE POLICY "School admins insert school user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM profiles p WHERE p.school_id = get_user_school_id(auth.uid())
  )
);

-- Allow school admins to delete roles for users in their school
CREATE POLICY "School admins delete school user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM profiles p WHERE p.school_id = get_user_school_id(auth.uid())
  )
);
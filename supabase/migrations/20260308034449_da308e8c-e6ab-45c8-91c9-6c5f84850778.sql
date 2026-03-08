
-- Allow admins to delete pickup logs (for cancel and daily reset)
CREATE POLICY "Admins delete pickup logs"
ON public.pickup_logs
FOR DELETE
TO authenticated
USING (
  (school_id = get_user_school_id(auth.uid()))
  AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

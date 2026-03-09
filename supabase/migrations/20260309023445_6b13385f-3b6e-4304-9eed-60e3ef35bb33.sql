
CREATE POLICY "Super admins view all students"
ON public.students
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins view all classes"
ON public.classes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

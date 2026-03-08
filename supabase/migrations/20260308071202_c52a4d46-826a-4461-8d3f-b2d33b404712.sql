-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);

-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public) VALUES ('school-logos', 'school-logos', true);

-- RLS for student-photos: authenticated users can upload/view for their school
CREATE POLICY "Authenticated users can upload student photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Anyone can view student photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can update student photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can delete student photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-photos');

-- RLS for school-logos
CREATE POLICY "Authenticated users can upload school logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-logos');

CREATE POLICY "Anyone can view school logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'school-logos');

CREATE POLICY "Authenticated users can update school logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-logos');

CREATE POLICY "Authenticated users can delete school logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'school-logos');

-- School groups for multi-branch
CREATE TABLE public.school_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ADD COLUMN group_id uuid REFERENCES public.school_groups(id) ON DELETE SET NULL;

ALTER TABLE public.school_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage school groups"
ON public.school_groups FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
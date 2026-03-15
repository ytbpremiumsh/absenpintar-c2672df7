
-- Trusted schools for landing page
CREATE TABLE public.landing_trusted_schools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  initials text NOT NULL,
  logo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_trusted_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trusted schools" ON public.landing_trusted_schools
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Super admins manage trusted schools" ON public.landing_trusted_schools
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Testimonials for landing page
CREATE TABLE public.landing_testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  text text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonials" ON public.landing_testimonials
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Super admins manage testimonials" ON public.landing_testimonials
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Also allow anon to read
CREATE POLICY "Anon can view trusted schools" ON public.landing_trusted_schools
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can view testimonials" ON public.landing_testimonials
  FOR SELECT TO anon USING (is_active = true);

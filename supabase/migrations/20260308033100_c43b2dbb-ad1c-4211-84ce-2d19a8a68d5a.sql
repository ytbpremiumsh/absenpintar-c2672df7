
CREATE TABLE public.pickup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  auto_activate_time time DEFAULT '14:00:00',
  auto_deactivate_time time DEFAULT '17:00:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE public.pickup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view school pickup settings"
  ON public.pickup_settings FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins manage pickup settings"
  ON public.pickup_settings FOR ALL TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE TRIGGER update_pickup_settings_updated_at
  BEFORE UPDATE ON public.pickup_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

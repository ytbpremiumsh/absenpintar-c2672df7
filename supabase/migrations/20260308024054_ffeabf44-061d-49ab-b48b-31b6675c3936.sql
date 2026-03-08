
-- Create trigger for new user profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert the missing profile for the existing admin user
INSERT INTO public.profiles (user_id, full_name, school_id)
VALUES ('29560946-a62c-481f-8016-66df9fcdcf5e', 'Admin Demo', 'eda19e4d-01bf-45c4-8918-05fd821d90f3')
ON CONFLICT (user_id) DO UPDATE SET school_id = EXCLUDED.school_id, full_name = EXCLUDED.full_name;

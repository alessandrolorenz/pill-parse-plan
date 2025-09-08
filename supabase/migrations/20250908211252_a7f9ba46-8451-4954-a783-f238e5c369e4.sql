-- Fix the handle_new_user function to work with available fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.users (user_id, name, email, provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.email,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'provider' = 'google' THEN 'google'
      WHEN position('@' in COALESCE(NEW.email, '')) > 0 AND position('gmail.com' in COALESCE(NEW.email, '')) > 0 THEN 'google'
      ELSE 'email'
    END
  );
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
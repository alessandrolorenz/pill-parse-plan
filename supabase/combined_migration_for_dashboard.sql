--============================================================
-- CONSOLIDATED MIGRATION for manual execution via Supabase Dashboard
-- SQL Editor (https://supabase.com/dashboard/project/qryiaiuwcqaoyjlbywfn/sql/new)
-- Combines all files in supabase/migrations/ in chronological order.
-- Fixes an invalid RLS policy syntax found in the original
-- 20251202000000_notifications.sql (FOR INSERT, UPDATE, DELETE is not
-- valid Postgres syntax — split into 3 separate policies below).
-- ============================================================

-- ==========================================================
-- Migration 1: 20250906002006_4eeaf452-2d53-4dfa-9520-2b143cca9de4.sql
-- ==========================================================

-- Create users table for user profiles
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  provider TEXT DEFAULT 'email',
  active_subscription BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create treatments table
CREATE TABLE public.treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = user_id);

-- Create RLS policies for treatments table
CREATE POLICY "Users can view their own treatments"
ON public.treatments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own treatments"
ON public.treatments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own treatments"
ON public.treatments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own treatments"
ON public.treatments
FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for events table
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM treatments WHERE id = treatment_id));

CREATE POLICY "Users can create their own events"
ON public.events
FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM treatments WHERE id = treatment_id));

CREATE POLICY "Users can update their own events"
ON public.events
FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM treatments WHERE id = treatment_id));

CREATE POLICY "Users can delete their own events"
ON public.events
FOR DELETE
USING (auth.uid() IN (SELECT user_id FROM treatments WHERE id = treatment_id));

-- Create storage bucket for prescriptions
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);

-- Create storage policies
CREATE POLICY "Users can view their own prescription images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own prescription images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own prescription images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own prescription images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================================
-- Migration 2: 20250906002037_e337fe49-289f-403c-8dc2-039e123dc65e.sql
-- (search_path hardening for update_updated_at_column)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================================
-- Migration 3: 20250908211252_a7f9ba46-8451-4954-a783-f238e5c369e4.sql
-- (final handle_new_user implementation + trigger)
-- ==========================================================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- Migration 4: 20251202000000_notifications.sql
-- NOTE: fixed invalid "FOR INSERT, UPDATE, DELETE" policy syntax
-- from the original file (split into 3 separate policies).
-- ==========================================================

-- Tabela de subscriptions Web Push por usuário/dispositivo
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Tabela de lembretes de notificação (alarmes)
CREATE TABLE public.notification_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  snooze_parent_id UUID REFERENCES public.notification_reminders(id),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification reminders"
ON public.notification_reminders
FOR SELECT
USING (auth.uid() = user_id);

-- FIXED: original had invalid "FOR INSERT, UPDATE, DELETE" in one policy.
-- Split into three valid policies below.
CREATE POLICY "Users can insert their own notification reminders"
ON public.notification_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification reminders"
ON public.notification_reminders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification reminders"
ON public.notification_reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para manter updated_at em notification_reminders
CREATE TRIGGER update_notification_reminders_updated_at
BEFORE UPDATE ON public.notification_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
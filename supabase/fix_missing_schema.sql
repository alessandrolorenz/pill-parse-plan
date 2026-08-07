-- ============================================================
-- CORREÇÃO DE SCHEMA — projeto Supabase qryiaiuwcqaoyjlbywfn ("Treatments")
-- Rodar no SQL Editor:
--   https://supabase.com/dashboard/project/qryiaiuwcqaoyjlbywfn/sql/new
--
-- DIAGNÓSTICO (verificado via REST API em 2026-08-06):
-- O projeto remoto contém o schema de OUTRO aplicativo (modelo
-- users/treatments/medications/schedules/notifications, com
-- "expo_notification_id" — um app Expo). Ele NÃO corresponde às
-- migrations deste repositório. Estado real das tabelas remotas:
--
--   users       (id, email, preferences, created_at, active_subscription)
--               -> não tem user_id / name / provider
--   treatments  (id, user_id, name, status, start_date, end_date,
--                prescription_image_url, created_at)
--               -> não tem title / notes / image_path,
--                  e name + start_date são NOT NULL
--   events      (id, user_id, type, payload, created_at)
--               -> é um log de auditoria, NÃO a agenda de doses;
--                  type + payload são NOT NULL
--   bucket "prescriptions" -> NÃO EXISTE
--
-- Por isso não basta um "ADD COLUMN": as colunas NOT NULL das tabelas
-- estrangeiras (treatments.name, treatments.start_date, events.type,
-- events.payload) fariam todo INSERT do app falhar de qualquer forma.
--
-- ESTRATÉGIA: mover as tabelas incompatíveis para um schema "legacy"
-- (nada é apagado — os dados continuam consultáveis em legacy.*) e
-- recriar em "public" o schema que as migrations deste repo definem.
-- Mover de schema leva junto índices, constraints e policies, evitando
-- colisão de nomes.
--
-- ATENÇÃO: revise a seção 1 antes de rodar. Se as tabelas remotas
-- tiverem dados de produção de outro app, migre-os antes.
-- Para conferir volume antes de executar:
--   select 'users' t, count(*) from public.users
--   union all select 'treatments', count(*) from public.treatments
--   union all select 'events', count(*) from public.events
--   union all select 'medications', count(*) from public.medications
--   union all select 'schedules', count(*) from public.schedules;
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Arquivar o schema estrangeiro (dados preservados em legacy.*)
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS legacy;

-- Ordem irrelevante para FKs (elas atravessam schemas), mas mantida
-- do mais dependente para o menos dependente por clareza.
ALTER TABLE IF EXISTS public.notification_reminders SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.notifications          SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.audit_logs             SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.schedules              SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.medications            SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.events                 SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.treatments             SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.users                  SET SCHEMA legacy;

-- public.push_subscriptions já bate com a migration do repo e só
-- referencia auth.users — fica onde está.

-- ------------------------------------------------------------
-- 2) Recriar o schema esperado pelo app
--    (espelha supabase/migrations/20250906002006_*.sql)
-- ------------------------------------------------------------
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

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events     ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own treatments"
ON public.treatments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own treatments"
ON public.treatments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own treatments"
ON public.treatments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own treatments"
ON public.treatments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
ON public.events FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.treatments WHERE id = treatment_id));

CREATE POLICY "Users can create their own events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.treatments WHERE id = treatment_id));

CREATE POLICY "Users can update their own events"
ON public.events FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM public.treatments WHERE id = treatment_id));

CREATE POLICY "Users can delete their own events"
ON public.events FOR DELETE
USING (auth.uid() IN (SELECT user_id FROM public.treatments WHERE id = treatment_id));

-- ------------------------------------------------------------
-- 4) Bucket de storage das receitas (não existe no projeto remoto)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own prescription images" ON storage.objects;
CREATE POLICY "Users can view their own prescription images"
ON storage.objects FOR SELECT
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own prescription images" ON storage.objects;
CREATE POLICY "Users can upload their own prescription images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own prescription images" ON storage.objects;
CREATE POLICY "Users can update their own prescription images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own prescription images" ON storage.objects;
CREATE POLICY "Users can delete their own prescription images"
ON storage.objects FOR DELETE
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ------------------------------------------------------------
-- 5) Funções e triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
      WHEN position('@' in COALESCE(NEW.email, '')) > 0
       AND position('gmail.com' in COALESCE(NEW.email, '')) > 0 THEN 'google'
      ELSE 'email'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 6) Backfill: quem já se cadastrou antes do trigger existir
--    (ex.: ale@teste.com) não tem linha em public.users
-- ------------------------------------------------------------
INSERT INTO public.users (user_id, name, email, provider)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'name', au.raw_user_meta_data ->> 'full_name'),
  au.email,
  CASE
    WHEN au.raw_user_meta_data ->> 'provider' = 'google' THEN 'google'
    WHEN position('@' in COALESCE(au.email, '')) > 0
     AND position('gmail.com' in COALESCE(au.email, '')) > 0 THEN 'google'
    ELSE 'email'
  END
FROM auth.users au
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------
-- 7) Recriar notification_reminders apontando para as tabelas novas
--    (a versão antiga tinha FK para as treatments/events estrangeiras
--     e foi junto para legacy no passo 1)
-- ------------------------------------------------------------
CREATE TABLE public.notification_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  snooze_parent_id UUID REFERENCES public.notification_reminders(id),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification reminders"
ON public.notification_reminders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification reminders"
ON public.notification_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification reminders"
ON public.notification_reminders FOR UPDATE
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification reminders"
ON public.notification_reminders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_reminders_updated_at
BEFORE UPDATE ON public.notification_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ============================================================
-- VERIFICAÇÃO (rodar depois, deve retornar sem erro):
--   select user_id, active_subscription from public.users limit 1;
--   select id, title, notes, image_path from public.treatments limit 1;
--   select id, treatment_id, date, time, label, done from public.events limit 1;
--   select id from storage.buckets where id = 'prescriptions';
-- ============================================================

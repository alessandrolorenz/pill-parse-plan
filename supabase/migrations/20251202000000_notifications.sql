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

CREATE POLICY "Users can manage their own notification reminders"
ON public.notification_reminders
FOR INSERT, UPDATE, DELETE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para manter updated_at em notification_reminders
CREATE TRIGGER update_notification_reminders_updated_at
BEFORE UPDATE ON public.notification_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



import { CalendarEvent } from './types';
import { supabase } from '@/integrations/supabase/client';

// ATENÇÃO: defina a VAPID public key no .env e exponha via import.meta.env.VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications não são suportadas neste navegador');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY não configurada; push desabilitado');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  return subscription;
}

export async function registerPushSubscription(): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    console.warn('Usuário não autenticado; não registrando push subscription');
    return;
  }

  const subscription = await getOrCreatePushSubscription();
  if (!subscription) return;

  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // O backend pode validar este token se necessário
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        subscription,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: 'web'
        }
      })
    });
  } catch (error) {
    console.error('Erro ao registrar push subscription', error);
  }
}

export async function scheduleNotifications(
  treatmentId: string,
  events: CalendarEvent[]
): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    console.warn('Usuário não autenticado; não agendando notificações');
    return;
  }

  // Filtrar próximas 48h para não lotar a fila
  const now = new Date();
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.startISO);
    return eventDate > now && eventDate <= next48Hours;
  });

  if (upcomingEvents.length === 0) {
    console.warn('Nenhum evento nas próximas 48h para agendar notificações');
    return;
  }

  try {
    await fetch('/api/notifications/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        treatmentId,
        events: upcomingEvents
      })
    });
  } catch (error) {
    console.error('Erro ao agendar notificações', error);
  }
}

export function showTestNotification(): void {
  if (typeof window === 'undefined') return;

  if (Notification.permission === 'granted') {
    new Notification('Teste de Notificação', {
      body: 'As notificações estão funcionando!',
      icon: '/favicon.ico'
    });
  }
}
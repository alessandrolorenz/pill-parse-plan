import { CalendarEvent } from './types';

export async function requestNotificationPermission(): Promise<boolean> {
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

export function scheduleNotifications(events: CalendarEvent[]): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado');
    return;
  }

  // Filtrar eventos futuros próximos (próximas 48 horas)
  const now = new Date();
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.startISO);
    return eventDate > now && eventDate <= next48Hours;
  });

  // Salvar eventos no localStorage para o service worker acessar
  localStorage.setItem('scheduledEvents', JSON.stringify(upcomingEvents));
  
  // Notificar o service worker para agendar as notificações
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATIONS',
      events: upcomingEvents
    });
  }
}

export function showTestNotification(): void {
  if (Notification.permission === 'granted') {
    new Notification('Teste de Notificação', {
      body: 'As notificações estão funcionando!',
      icon: '/favicon.ico'
    });
  }
}

// Função para o Service Worker - será usada em public/sw.js
export const serviceWorkerNotificationCode = `
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const events = event.data.events;
    
    // Cancelar notificações anteriores
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => notification.close());
    });
    
    // Agendar novas notificações
    events.forEach(eventData => {
      const eventTime = new Date(eventData.startISO).getTime();
      const now = Date.now();
      const delay = eventTime - now;
      
      if (delay > 0) {
        setTimeout(() => {
          self.registration.showNotification(eventData.title, {
            body: eventData.description || 'Hora do medicamento!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            actions: [
              { action: 'taken', title: 'Tomei' },
              { action: 'snooze', title: 'Lembrar em 5min' }
            ]
          });
        }, delay);
      }
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'taken') {
    // Marcar como tomado (implementar no futuro)
    console.log('Medicamento marcado como tomado');
  } else if (event.action === 'snooze') {
    // Reagendar para 5 minutos
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: '/favicon.ico'
      });
    }, 5 * 60 * 1000);
  } else {
    // Abrir app
    clients.openWindow('/');
  }
});
`;
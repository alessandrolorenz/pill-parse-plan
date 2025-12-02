// Service Worker para Tratamento por Receita
// Handles caching, push notifications e cliques em notificações

const CACHE_NAME = 'tratamento-receita-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Recebe push do servidor e mostra a notificação imediatamente
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Lembrete de medicamento';
  const body = data.body || 'Hora de tomar seu medicamento.';

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data,
    actions: [
      { action: 'taken', title: 'Tomei' },
      { action: 'snooze', title: 'Lembrar em 5min' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action || 'open';

  // Envia ação para o backend registrar "tomei" ou "soneca"
  const handleClick = async () => {
    try {
      // URL relativa ao domínio atual; o servidor Express deve expor este endpoint
      await fetch('/api/notifications/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          reminderId: data.reminderId || null,
          eventId: data.eventId || null,
          treatmentId: data.treatmentId || null
        })
      });
    } catch (error) {
      // Apenas loga; a UX principal é abrir o app
      console.error('Erro ao registrar clique na notificação', error);
    }

    if (action === 'open' || !action) {
      // Foca/abre a aplicação
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (allClients.length > 0) {
        allClients[0].focus();
      } else {
        await clients.openWindow('/');
      }
    }
  };

  event.waitUntil(handleClick());
});

// Background sync for future features
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    // Handle background sync for future features
    console.log('Background sync triggered');
  }
});
// Service Worker para Tratamento por Receita
// Handles caching and notifications

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

// Notification handling
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const events = event.data.events;
    
    // Cancel previous notifications
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => notification.close());
    });
    
    // Schedule new notifications
    events.forEach(eventData => {
      const eventTime = new Date(eventData.startISO).getTime();
      const now = Date.now();
      const delay = eventTime - now;
      
      if (delay > 0 && delay <= 48 * 60 * 60 * 1000) { // Only schedule for next 48 hours
        setTimeout(() => {
          self.registration.showNotification(eventData.title, {
            body: eventData.description || 'Hora do medicamento!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
              { action: 'taken', title: 'Tomei' },
              { action: 'snooze', title: 'Lembrar em 5min' }
            ],
            data: eventData
          });
        }, delay);
      }
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'taken') {
    // Mark as taken (implement in future)
    console.log('Medicamento marcado como tomado');
  } else if (event.action === 'snooze') {
    // Reschedule for 5 minutes
    const eventData = event.notification.data;
    setTimeout(() => {
      self.registration.showNotification(eventData.title, {
        body: eventData.description || 'Lembrete de medicamento (reagendado)',
        icon: '/favicon.ico',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
    }, 5 * 60 * 1000);
  } else {
    // Open app
    clients.openWindow('/');
  }
});

// Background sync for future features
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    // Handle background sync for future features
    console.log('Background sync triggered');
  }
});
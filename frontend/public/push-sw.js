// Figyeljük a bejövő push üzeneteket a szervertől
self.addEventListener('push', function(event) {

  console.log("🔥 SW: Üzenet megérkezett a Google-től a böngészőbe!", event);

  let data = {};
  
  if (event.data) {
    data = event.data.json();
  } else {
    data = { title: 'Szendvics Szerda', body: 'Új értesítés érkezett!' };
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png', 
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/' 
    }
  };

  // Megjelenítjük a felugró értesítést
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Mi történjen, ha a felhasználó rákattint az értesítésre?
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Ha már nyitva van az app, átváltunk arra az ablakra
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(event.notification.data.url) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // Ha nincs nyitva, nyitunk egy új ablakot
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
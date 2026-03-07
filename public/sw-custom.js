// Workbox-Precaching wird von next-pwa hier injiziert (muss als erstes stehen)
// eslint-disable-next-line no-undef
self.__WB_MANIFEST;

function toAbsoluteUrl(url) {
  try {
    return new URL(url || "/dashboard", self.location.origin).toString();
  } catch {
    return `${self.location.origin}/dashboard`;
  }
}

// ---------------------------------------------------------------------------
// Push-Event: Browser empfaengt verschluesselte Nachricht vom Push-Service
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Azure DevOps", body: event.data.text(), tag: "generic", url: "/" };
  }

  const options = {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag ?? "azdevops",          // Verhindert doppelte Notifications fuer denselben Event
    renotify: false,                       // Kein erneutes Vibrieren bei gleichem Tag
    data: { url: data.url ?? "/dashboard" },
    // Aktions-Buttons (werden auf Android und einigen Desktop-Browsern angezeigt)
    actions: [
      { action: "open", title: "Oeffnen" },
      { action: "dismiss", title: "Schliessen" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Azure DevOps", options)
  );
});

// ---------------------------------------------------------------------------
// NotificationClick: App oeffnen und zur richtigen Deep-Link-Route navigieren
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // "Schliessen"-Aktion: Notification nur schliessen, keine Navigation
  if (event.action === "dismiss") return;

  const targetUrl = toAbsoluteUrl(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      // eslint-disable-next-line no-undef
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });

      // Bereits offenes Fenster der App fokussieren und zur Ziel-URL navigieren
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin) || !("focus" in client)) {
          continue;
        }
        await client.focus();
        if ("navigate" in client) {
          await client.navigate(targetUrl);
        }
        return;
      }

      // Kein offenes Fenster: neues oeffnen
      // eslint-disable-next-line no-undef
      await clients.openWindow(targetUrl);
    })()
  );
});

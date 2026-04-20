const DEFAULT_TITLE = "Postly";
const DEFAULT_ICON = "/postly-icon.png";
const DEFAULT_BADGE = "/postly-icon.png";
const DEFAULT_URL = "/dashboard";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function safeParsePayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    try {
      return JSON.parse(event.data.text());
    } catch {
      return {};
    }
  }
}

function toAbsoluteUrl(url) {
  try {
    return new URL(url || DEFAULT_URL, self.location.origin).href;
  } catch {
    return new URL(DEFAULT_URL, self.location.origin).href;
  }
}

self.addEventListener("push", (event) => {
  const payload = safeParsePayload(event);
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title
      : DEFAULT_TITLE;
  const body =
    typeof payload.body === "string" ? payload.body : "Шинэ мэдэгдэл ирлээ.";
  const icon =
    typeof payload.icon === "string" && payload.icon.trim()
      ? payload.icon
      : DEFAULT_ICON;
  const badge =
    typeof payload.badge === "string" && payload.badge.trim()
      ? payload.badge
      : DEFAULT_BADGE;
  const tag =
    typeof payload.tag === "string" && payload.tag.trim()
      ? payload.tag
      : "postly-notification";
  const url = toAbsoluteUrl(typeof payload.url === "string" ? payload.url : DEFAULT_URL);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: {
        url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = toAbsoluteUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (!client.url) {
          continue;
        }

        const clientUrl = new URL(client.url);

        if (clientUrl.origin !== self.location.origin) {
          continue;
        }

        if ("focus" in client) {
          await client.focus();
        }

        if ("navigate" in client && client.url !== targetUrl) {
          await client.navigate(targetUrl);
        }

        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    }),
  );
});

/// <reference lib="webworker" />
import {PROFILE_AVATAR_WIDTH, EVENT_AVATAR_WIDTH} from "./shared/components/user/const"
import {CacheFirst, StaleWhileRevalidate} from "workbox-strategies"
import {CacheableResponsePlugin} from "workbox-cacheable-response"
import {precacheAndRoute, PrecacheEntry} from "workbox-precaching"
import {ExpirationPlugin} from "workbox-expiration"
import {registerRoute} from "workbox-routing"
import {clientsClaim} from "workbox-core"
import {nip19} from "nostr-tools"

// eslint-disable-next-line no-undef
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[]
}

precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

// cache everything in current domain /assets because precache doesn't seem to include everything
registerRoute(
  ({url}) => url.origin === self.location.origin && url.pathname.startsWith("/assets"),
  new StaleWhileRevalidate({
    cacheName: "assets-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        matchOptions: {
          ignoreVary: true,
        },
      }),
    ],
  })
)

registerRoute(
  ({url}) => url.pathname.endsWith("/.well-known/nostr.json"),
  new StaleWhileRevalidate({
    cacheName: "nostr-json-cache",
    plugins: [new ExpirationPlugin({maxAgeSeconds: 4 * 60 * 60})],
  })
)

// Avatars
registerRoute(
  ({request, url}) => {
    return (
      request.destination === "image" &&
      url.href.startsWith("https://imgproxy.iris.to/") &&
      (url.pathname.includes(
        `rs:fill:${PROFILE_AVATAR_WIDTH * 2}:${PROFILE_AVATAR_WIDTH * 2}`
      ) ||
        url.pathname.includes(
          `rs:fill:${EVENT_AVATAR_WIDTH * 2}:${EVENT_AVATAR_WIDTH * 2}`
        ))
    )
  },
  new CacheFirst({
    cacheName: "avatar-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100, // gif avatars can still be large
        matchOptions: {
          ignoreVary: true,
        },
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache images from any domain with size limit
registerRoute(
  // match images except gif
  ({request, url}) => request.destination === "image" && !url.pathname.endsWith(".gif"),
  new CacheFirst({
    cacheName: "image-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        matchOptions: {
          ignoreVary: true,
        },
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

registerRoute(
  ({url}) =>
    url.origin === "https://nostr.api.v0l.io" &&
    url.pathname.startsWith("/api/v1/preview"),
  new CacheFirst({
    cacheName: "preview-cache",
    plugins: [
      new ExpirationPlugin({maxAgeSeconds: 24 * 60 * 60}),
      new CacheableResponsePlugin({statuses: [0, 200]}),
    ],
  })
)

registerRoute(
  ({url}) =>
    url.origin === "https://api.snort.social" &&
    url.pathname.startsWith("/api/v1/translate"),
  new CacheFirst({
    cacheName: "translate-cache",
    plugins: [
      new ExpirationPlugin({maxEntries: 1000}),
      new CacheableResponsePlugin({
        statuses: [0, 200, 204],
      }),
    ],
  })
)

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
self.addEventListener("install", (event) => {
  // delete all cache on install
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.debug("Deleting cache: ", cacheName)
          return caches.delete(cacheName)
        })
      )
    })
  )
  // always skip waiting
  self.skipWaiting()
})

interface PushData {
  event: {
    id: string
    pubkey: string
    created_at: number
    kind: number
    tags: string[][]
    content: string
    sig: string
  }
  title: string
  body: string
  icon: string
  url: string
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data as PushData

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({type: "window"})
      // Extract pathname from the url
      const url = new URL(data.url).pathname

      for (const client of windows) {
        if (client.url === url && "focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })()
  )
})

self.addEventListener("push", async (e) => {
  const data = e.data?.json() as PushData | undefined
  console.debug(data)

  if (data) {
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      data: data,
    })
  }
})

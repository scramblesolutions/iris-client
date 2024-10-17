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

const enum PushType {
  Mention = 1,
  Reaction = 2,
  Zap = 3,
  Repost = 4,
  DirectMessage = 5,
}

interface PushNotification {
  type: PushType
  data: object
}

interface CompactMention {
  id: string
  created_at: number
  content: string
  author: CompactProfile
  mentions: Array<CompactProfile>
}

interface CompactReaction {
  id: string
  created_at: number
  content: string
  author: CompactProfile
  event?: string
  amount?: number
}

interface CompactProfile {
  pubkey: string
  name?: string
  avatar?: string
}

self.addEventListener("notificationclick", (event) => {
  const ev = JSON.parse(event.notification.data) as PushNotification

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({type: "window"})
      const url = () => {
        if (ev.type === PushType.Zap || ev.type === PushType.Reaction) {
          const mention = ev.data as CompactReaction
          if (mention.event) {
            return `/${nip19.noteEncode(mention.event)}`
          }
        } else if (ev.type === PushType.DirectMessage) {
          /*
          const reaction = ev.data as CompactReaction
          return `/messages/${encodeTLVEntries(NostrPrefix.Chat17, {
            type: TLVEntryType.Author,
            value: reaction.author.pubkey,
            length: 32,
          })}`
          */
        }
        return (ev.data as {id?: string}).id
          ? `/${nip19.npubEncode((ev.data as {id: string}).id)}`
          : "/notifications"
      }
      for (const client of windows) {
        if (client.url === url() && "focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url())
    })()
  )
})

self.addEventListener("push", async (e) => {
  console.debug(e)
  const data = e.data?.json() as PushNotification | undefined
  console.debug(data)
  if (data) {
    switch (data.type) {
      case PushType.Mention: {
        const evx = data.data as CompactMention
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} replied`,
          makeNotification(data)
        )
        break
      }
      case PushType.Reaction: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} reacted`,
          makeNotification(data)
        )
        break
      }
      case PushType.Zap: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} zapped${evx.amount ? ` ${formatShort(evx.amount)} sats` : ""}`,
          makeNotification(data)
        )
        break
      }
      case PushType.Repost: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} reposted`,
          makeNotification(data)
        )
        break
      }
      case PushType.DirectMessage: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} sent you a DM`,
          makeNotification(data)
        )
        break
      }
    }
  }
})

const MentionNostrEntityRegex =
  /(nostr:n(?:pub|profile|event|ote|addr)1[acdefghjklmnpqrstuvwxyz023456789]+)/g

function replaceMentions(content: string, profiles: Array<CompactProfile>) {
  return content
    .split(MentionNostrEntityRegex)
    .map((link) => {
      if (MentionNostrEntityRegex.test(link)) {
        try {
          const decoded = nip19.decode(link)
          if (
            ["npub", "nprofile"].includes(decoded.type) ||
            ["nevent", "note"].includes(decoded.type)
          ) {
            const px = profiles.find((a) => a.pubkey === nip19.decode(link).data)
            return `@${displayNameOrDefault(px ?? {pubkey: link})}`
          }
        } catch (e) {
          // ignore
        }
      }
      return link
    })
    .join("")
}

function displayNameOrDefault(p: CompactProfile) {
  if ((p.name?.length ?? 0) > 0) {
    return p.name
  }
  return nip19.npubEncode(p.pubkey).slice(0, 12)
}

function makeNotification(n: PushNotification) {
  const evx = n.data as CompactMention | CompactReaction

  const body = () => {
    if (n.type === PushType.Mention) {
      return (
        "mentions" in evx ? replaceMentions(evx.content, evx.mentions) : evx.content
      ).substring(0, 250)
    } else if (n.type === PushType.Reaction) {
      if (evx.content === "+") return "💜"
      if (evx.content === "-") return "👎"
      return evx.content
    } else if (n.type === PushType.DirectMessage) {
      return ""
    } else if (n.type === PushType.Repost) {
      return ""
    }
    return evx.content.substring(0, 250)
  }
  const ret = {
    body: body(),
    icon:
      evx.author.avatar ??
      `https://nostr.api.v0l.io/api/v1/avatar/robots/${evx.author.pubkey}.webp`,
    timestamp: evx.created_at * 1000,
    tag: evx.id,
    data: JSON.stringify(n),
  }
  console.debug(ret)
  return ret
}

function formatShort(n: number) {
  if (n > 1000) {
    return (n / 1000).toFixed(1)
  } else {
    return n.toFixed(0)
  }
}

import socialGraph from "@/utils/socialGraph"
import {NDKEvent} from "@nostr-dev-kit/ndk"
import {ndk} from "irisdb-nostr"

export const ApiHost = "https://api.snort.social"

export interface PushNotifications {
  endpoint: string
  p256dh: string
  auth: string
  scope: string
}

/**
 * Can be used for web push notifications
 */
export default class SnortApi {
  #url: string

  constructor(url?: string) {
    this.#url = new URL(url ?? ApiHost).toString()
  }

  twitterImport(username: string) {
    return this.#getJson<Array<string>>(
      `api/v1/twitter/follows-for-nostr?username=${encodeURIComponent(username)}`
    )
  }

  getPushNotificationInfo() {
    return this.#getJson<{publicKey: string}>("api/v1/notifications/info")
  }

  registerPushNotifications(sub: PushNotifications) {
    return this.#getJsonAuthd<void>("api/v1/notifications/register", "POST", sub)
  }

  async #getJsonAuthd<T>(
    path: string,
    method?: "GET" | string,
    body?: object,
    headers?: {[key: string]: string}
  ): Promise<T> {
    const event = new NDKEvent(ndk(), {
      kind: 27235, // http authentication
      tags: [
        ["url", `${this.#url}${path}`],
        ["method", method ?? "GET"],
      ],
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      pubkey: [...socialGraph().getUsersByFollowDistance(0)][0],
    })
    await event.sign()
    const nostrEvent = await event.toNostrEvent()
    console.log(nostrEvent, JSON.stringify(nostrEvent))

    return this.#getJson<T>(path, method, body, {
      ...headers,
      authorization: `Nostr ${window.btoa(JSON.stringify(nostrEvent))}`,
    })
  }

  async #getJson<T>(
    path: string,
    method?: "GET" | string,
    body?: object,
    headers?: {[key: string]: string}
  ): Promise<T> {
    const rsp = await fetch(`${this.#url}${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        ...(body ? {"content-type": "application/json"} : {}),
        ...headers,
      },
    })

    if (rsp.ok) {
      const text = (await rsp.text()) as string | null
      if ((text?.length ?? 0) > 0) {
        const obj = JSON.parse(text!)
        if ("error" in obj) {
          throw new Error(obj.error, obj.code)
        }
        return obj as T
      } else {
        return {} as T
      }
    } else {
      throw new Error("Invalid response")
    }
  }
}

export function trackEvent(
  event: string,
  props?: Record<string, string | boolean>,
  e?: {destination?: {url: string}}
) {
  if (!import.meta.env.DEV && CONFIG.features.analytics) {
    fetch("https://pa.v0l.io/api/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        d: CONFIG.hostname,
        n: event,
        r: document.referrer === window.location.href ? null : document.referrer,
        p: props,
        u:
          e?.destination?.url ??
          `${window.location.protocol}//${window.location.host}${window.location.pathname}`,
      }),
    })
  }
}

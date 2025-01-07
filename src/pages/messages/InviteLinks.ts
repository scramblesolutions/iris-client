import {
  Channel,
  InviteLink,
  KeyType,
  NostrFilter,
  Sender,
  serializeChannelState,
} from "nostr-double-ratchet"
import {hexToBytes} from "@noble/hashes/utils"
import {localState, Unsubscribe} from "irisdb"
import {VerifiedEvent} from "nostr-tools"
import {ndk} from "irisdb-nostr"
import { subscribeToAuthorDMNotifications } from "@/utils/notifications"

const inviteLinks = new Map<string, InviteLink>()
const subscriptions = new Map<string, Unsubscribe>()

let user: {publicKey?: string; privateKey?: string} | null = null

export function getInviteLinks(
  callback: (id: string, inviteLink: InviteLink) => void
): Unsubscribe {
  inviteLinks.clear() // Clear the existing map before repopulating

  return localState.get("inviteLinks").forEach((link, path) => {
    const id = path.split("/").pop()!
    if (link && typeof link === "string") {
      try {
        const inviteLink = InviteLink.deserialize(link)
        callback(id, inviteLink)
      } catch (e) {
        console.error(e)
      }
    }
  })
}

const nostrSubscribe = (filter: NostrFilter, onEvent: (e: VerifiedEvent) => void) => {
  const sub = ndk().subscribe(filter)
  sub.on("event", (event) => {
    onEvent(event)
  })
  return () => sub.stop()
}

function listen() {
  if (user?.publicKey && user?.privateKey) {
    console.log("howdy", user)
    for (const id of inviteLinks.keys()) {
      if (!subscriptions.has(id)) {
        const inviteLink = inviteLinks.get(id)!
        const decrypt = user.privateKey
          ? hexToBytes(user.privateKey)
          : async (cipherText: string, pubkey: string) => {
              // @ts-expect-error: nip44 exists at runtime but is not in the type definition
              if (window.nostr?.nip44) {
                // @ts-expect-error: nip44 exists at runtime but is not in the type definition
                const result = window.nostr.nip44.decrypt(cipherText, pubkey)
                if (!result || typeof result !== "string") {
                  throw new Error("Failed to decrypt")
                }
                return result as string
              }
              throw new Error("No nostr extension or private key")
            }
        const unsubscribe = inviteLink.listen(
          decrypt,
          nostrSubscribe,
          (channel: Channel, identity?: string) => {
            console.log("channel", identity, channel)
            localState
              .get("channels")
              .get(identity || "asdf")
              .put(serializeChannelState(channel.state))
            const current = channel.getNostrSenderKeypair(Sender.Them, KeyType.Current)
            const next = channel.getNostrSenderKeypair(Sender.Them, KeyType.Next)
            subscribeToAuthorDMNotifications([current.publicKey, next.publicKey])
          }
        )
        subscriptions.set(id, unsubscribe)
      }
    }
  }
}

getInviteLinks((id, inviteLink) => {
  if (!inviteLinks.has(id)) {
    inviteLinks.set(id, inviteLink)
    listen()
  }
})

localState.get("user").on((u) => {
  user = u as {publicKey?: string; privateKey?: string}
  listen()
})

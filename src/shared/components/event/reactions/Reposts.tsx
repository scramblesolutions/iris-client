import socialGraph, {shouldHideEvent} from "@/utils/socialGraph.ts"
import {UserRow} from "@/shared/components/user/UserRow.tsx"
import {NDKEvent} from "@nostr-dev-kit/ndk"
import {useEffect, useState} from "react"
import {ndk} from "irisdb-nostr"

export default function Reposts({event}: {event: NDKEvent}) {
  const [reactions, setReactions] = useState<Map<string, NDKEvent>>(new Map())

  useEffect(() => {
    try {
      setReactions(new Map())
      const filter = {
        kinds: [6],
        ["#e"]: [event.id],
      }
      const sub = ndk().subscribe(filter)

      sub?.on("event", (event: NDKEvent) => {
        if (shouldHideEvent(event)) return
        setReactions((prev) => {
          const existing = prev.get(event.author.pubkey)
          if (existing) {
            if (existing.created_at! < event.created_at!) {
              prev.set(event.author.pubkey, event)
            }
          } else {
            prev.set(event.author.pubkey, event)
          }
          return new Map(prev)
        })
      })
      return () => {
        sub.stop()
      }
    } catch (error) {
      console.warn(error)
    }
  }, [event.id])

  return (
    <div className="flex flex-col gap-4">
      {reactions.size === 0 && <p>No reposts yet</p>}
      {Array.from(reactions.values())
        .sort((a, b) => {
          return (
            socialGraph().getFollowDistance(a.author.pubkey) -
            socialGraph().getFollowDistance(b.author.pubkey)
          )
        })
        .map((event) => (
          <UserRow showHoverCard={true} key={event.id} pubKey={event.author.pubkey} />
        ))}
    </div>
  )
}

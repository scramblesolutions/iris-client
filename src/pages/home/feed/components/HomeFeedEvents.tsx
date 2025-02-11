import {useCallback, useMemo, useEffect, useState} from "react"
import {NDKEvent} from "@nostr-dev-kit/ndk"

import {getEventReplyingTo, defaultFeedFilter, isGem, isIssue, isPR} from "@/utils/nostr"
import PublicKeyQRCodeButton from "@/shared/components/user/PublicKeyQRCodeButton"
import MiddleHeader from "@/shared/components/header/MiddleHeader"
import {fnByFilter, widgetFilterKinds} from "@/utils/filtering"
import Trending from "@/shared/components/feed/Trending.tsx"
import useHistoryState from "@/shared/hooks/useHistoryState"
import {seenEventIds, feedCache} from "@/utils/memcache"
import NotificationPrompt from "./NotificationPrompt"
import Feed from "@/shared/components/feed/Feed.tsx"
import {hasMedia} from "@/shared/components/embed"
import useFollows from "@/shared/hooks/useFollows"
import socialGraph from "@/utils/socialGraph"
import {useLocalState} from "irisdb-hooks"
import {localState} from "irisdb"

const UNSEEN_CACHE_KEY = "unseenFeed"

let myPubKey = ""
localState.get("user/publicKey").on((v) => (myPubKey = v || ""), false, undefined, String)

const EmptyPlaceholder = ({follows, myPubKey}: {follows: string[]; myPubKey?: string}) =>
  myPubKey ? (
    <div className="flex flex-col gap-8 items-center justify-center text-base-content/50">
      <div className="px-4 py-8 border-b border-base-300 flex flex-col gap-8 items-center w-full">
        {follows.length <= 1 ? "Follow someone to see content from them" : "No posts yet"}
        {myPubKey && follows.length <= 1 && (
          <PublicKeyQRCodeButton publicKey={myPubKey} />
        )}
      </div>
      Popular posts
    </div>
  ) : null

function HomeFeedEvents() {
  const follows = useFollows(myPubKey, true) // to update on follows change
  useLocalState("user/publicKey", "") // update on login
  const [refreshSignal] = useLocalState("refreshRouteSignal", 0, Number) // update on login
  const [activeTab, setActiveTab] = useHistoryState("unseen", "activeHomeTab")
  const [widgetFilter] = useLocalState("user/feedFilter", defaultFeedFilter)
  const [forceUpdate, setForceUpdate] = useState(0)

  const tabs = useMemo(
    () => [
      {
        name: "Unseen",
        path: "unseen",
        cacheKey: UNSEEN_CACHE_KEY,
        showRepliedTo: false,
        fetchFilterFn: (e: NDKEvent) => !getEventReplyingTo(e) && !seenEventIds.has(e.id),
      },
      {
        name: "Popular",
        path: "popular",
        filter: {
          kinds: [6, 7],
          since: Math.floor(Date.now() / 1000 - 60 * 60 * 24),
          limit: 200,
          authors: follows,
        },
        cacheKey: "popularFeed",
        sortLikedPosts: true,
      },
      {
        name: "Latest",
        path: "latest",
        showRepliedTo: false,
        displayFilterFn: (e: NDKEvent) =>
          !getEventReplyingTo(e) && socialGraph().getFollowDistance(e.pubkey) <= 1,
      },
      {
        name: "Replies",
        path: "replies",
        displayFilterFn: (e: NDKEvent) => socialGraph().getFollowDistance(e.pubkey) <= 1,
      },
      {
        name: "Media",
        path: "media",
        showRepliedTo: false,
        displayFilterFn: (e: NDKEvent) => hasMedia(e),
      },
      {
        name: "Adventure",
        path: "adventure",
        showRepliedTo: false,
        filter: {
          kinds: [1],
          limit: 100,
        },
        fetchFilterFn: (e: NDKEvent) =>
          !getEventReplyingTo(e) && socialGraph().getFollowDistance(e.pubkey) <= 5,
      },
    ],
    [follows]
  )

  const activeTabItem = useMemo(
    () => tabs.find((t) => t.path === activeTab) || tabs[0],
    [activeTab, tabs]
  )

  const openedAt = useMemo(() => Date.now(), [])

  useEffect(() => {
    if (activeTab !== "unseen") {
      feedCache.delete(UNSEEN_CACHE_KEY)
    }
    if (activeTab === "unseen" && refreshSignal > openedAt) {
      const cachedFeed = feedCache.get(UNSEEN_CACHE_KEY)
      if (cachedFeed) {
        for (const [k, v] of cachedFeed) {
          if (!activeTabItem.fetchFilterFn?.(v)) {
            cachedFeed.delete(k)
          }
        }
      }
      setForceUpdate((prev) => prev + 1) // Force update Feed component
    }
  }, [activeTabItem, openedAt, refreshSignal])

  const filters = useMemo(() => {
    if (!CONFIG.rightColumnFilters && activeTabItem.filter) {
      return activeTabItem.filter
    }

    return {
      authors: follows,
      kinds: CONFIG.rightColumnFilters ? widgetFilterKinds(widgetFilter) : [1, 6],
      limit: 100,
    }
  }, [follows, activeTabItem, widgetFilter])

  const displayFilterFn = useCallback(
    (event: NDKEvent) => {
      if (CONFIG.rightColumnFilters) {
        // filter out kind 30078 meta events
        if (event.kind === 30078 && !isGem(event) && !isIssue(event) && !isPR(event)) {
          return false
        }
        for (const [k, fn] of Object.entries(fnByFilter)) {
          const allowed = widgetFilter.includes(k)
          const match = fn(event)
          if (match && !allowed) {
            return false
          }
        }
        return filters.kinds.includes(event.kind!)
      }
      const tabFilter = activeTabItem.displayFilterFn
      return tabFilter ? tabFilter(event) : true
    },
    [activeTabItem, filters, widgetFilter]
  )

  const feedName =
    follows.length <= 1
      ? "Home"
      : tabs.find((t) => t.path === activeTab)?.name || "Following"

  return (
    <>
      <MiddleHeader title={feedName} />
      {follows.length > 1 && myPubKey && !CONFIG.rightColumnFilters && (
        <div className="px-4 pb-4 flex flex-row gap-2 overflow-x-auto max-w-[100vw] scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.path}
              className={`btn btn-sm ${activeTab === t.path ? "btn-primary" : "btn-neutral"}`}
              onClick={() => setActiveTab(t.path)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      <NotificationPrompt />
      <Feed
        key={activeTab === "unseen" ? "unseen" : "other"}
        filters={filters}
        displayFilterFn={displayFilterFn}
        fetchFilterFn={activeTabItem.fetchFilterFn}
        cacheKey={activeTabItem.cacheKey}
        showRepliedTo={CONFIG.rightColumnFilters || activeTabItem.showRepliedTo}
        emptyPlaceholder={<EmptyPlaceholder follows={follows} myPubKey={myPubKey} />}
        forceUpdate={forceUpdate}
        sortLikedPosts={activeTabItem.sortLikedPosts}
      />
      {follows.length <= 1 && <Trending small={false} contentType="images" />}
    </>
  )
}

export default HomeFeedEvents

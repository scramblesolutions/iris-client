import {useEffect, useMemo, useRef, useState, useCallback, ReactNode} from "react"
import {NDKEvent, NDKFilter} from "@nostr-dev-kit/ndk"

import InfiniteScroll from "@/shared/components/ui/InfiniteScroll"
import socialGraph, {shouldHideEvent} from "@/utils/socialGraph"
import useHistoryState from "@/shared/hooks/useHistoryState"
import {SortedMap} from "@/utils/SortedMap/SortedMap"
import FeedItem from "../event/FeedItem/FeedItem"
import {feedCache} from "@/utils/memcache"
import {useLocalState} from "irisdb-hooks"
import debounce from "lodash/debounce"
import {localState} from "irisdb"
import {ndk} from "irisdb-nostr"

import {INITIAL_DISPLAY_COUNT, DISPLAY_INCREMENT, eventComparator} from "./utils"
import imageEmbed from "@/shared/components/embed/images/Image"
import Video from "@/shared/components/embed/video/Video"
import UnknownUserEvents from "./UnknownUserEvents.tsx"
import {DisplayAsSelector} from "./DisplayAsSelector"
import NewEventsButton from "./NewEventsButton.tsx"
import ImageGridItem from "./ImageGridItem"

interface FeedProps {
  filters: NDKFilter
  displayFilterFn?: (event: NDKEvent) => boolean
  fetchFilterFn?: (event: NDKEvent) => boolean
  cacheKey?: string
  asReply?: boolean
  showRepliedTo?: boolean
  showReplies?: number
  onEvent?: (event: NDKEvent) => void
  borderTopFirst?: boolean
  emptyPlaceholder?: ReactNode
  forceUpdate?: number
  showEventsByUnknownUsersButton?: boolean
  displayAs?: "list" | "grid"
  onDisplayAsChange?: (display: "list" | "grid") => void
}

// TODO fix useLocalState so initial state is properly set from memory, so we can use it instead of this
let myPubKey = ""
localState.get("user/publicKey").on((k) => (myPubKey = k as string))

const DefaultEmptyPlaceholder = (
  <div className="p-8 flex flex-col gap-8 items-center justify-center text-base-content/50">
    No posts yet
  </div>
)

function Feed({
  filters,
  displayFilterFn,
  fetchFilterFn,
  cacheKey = JSON.stringify(filters),
  asReply = false,
  showRepliedTo = true,
  showReplies = 0,
  onEvent,
  borderTopFirst = true,
  emptyPlaceholder = DefaultEmptyPlaceholder,
  forceUpdate,
  showEventsByUnknownUsersButton = true,
  displayAs: initialDisplayAs = "list",
  onDisplayAsChange,
}: FeedProps) {
  const [displayCount, setDisplayCount] = useHistoryState(
    INITIAL_DISPLAY_COUNT,
    "displayCount"
  )
  const [localFilter, setLocalFilter] = useState(filters)
  const [newEventsFrom, setNewEventsFrom] = useState(new Set<string>())
  const [newEvents, setNewEvents] = useState(new Map<string, NDKEvent>())
  const [, setForceUpdate] = useState(0)
  const eventsRef = useRef(feedCache.get(cacheKey) || new SortedMap([], eventComparator))
  const oldestRef = useRef<number | undefined>()
  const initialLoadDone = useRef<boolean>(eventsRef.current.size > 0)

  const [hideEventsByUnknownUsers] = useLocalState(
    "settings/hideEventsByUnknownUsers",
    true
  )
  const [showEventsByUnknownUsers, setShowEventsByUnknownUsers] = useState(false)

  const [feedFilter] = useLocalState("user/feedFilter", [])

  const [displayAs, setDisplayAs] = useLocalState("user/feedDisplayAs", initialDisplayAs)

  const showNewEvents = () => {
    newEvents.forEach((event) => {
      if (!eventsRef.current.has(event.id)) {
        eventsRef.current.set(event.id, event)
      }
    })
    setNewEvents(new Map())
    setNewEventsFrom(new Set())
    setDisplayCount(INITIAL_DISPLAY_COUNT)
  }

  useEffect(() => {
    setLocalFilter(filters)
    oldestRef.current = undefined
  }, [filters])

  useEffect(() => {
    if (localFilter.authors && localFilter.authors.length === 0) {
      return
    }

    const sub = ndk().subscribe(localFilter)

    console.log("localFilter changed, resub", localFilter)

    const debouncedInitialLoadDone = debounce(
      () => {
        initialLoadDone.current = true
        setForceUpdate((prev) => prev + 1)
      },
      500,
      {maxWait: 2000}
    )

    debouncedInitialLoadDone()

    sub.on("event", (event) => {
      if (event && event.created_at && !eventsRef.current.has(event.id)) {
        if (oldestRef.current === undefined || oldestRef.current > event.created_at) {
          oldestRef.current = event.created_at
        }
        if (fetchFilterFn && !fetchFilterFn(event)) {
          return
        }
        const lastShownIndex = Math.min(displayCount, eventsRef.current.size) - 1
        const oldestShownTime =
          lastShownIndex >= 0 && eventsRef.current.nth(lastShownIndex)?.[1].created_at
        const isMyRecent =
          event.pubkey === myPubKey && event.created_at * 1000 > Date.now() - 10000
        if (
          !isMyRecent &&
          initialLoadDone.current &&
          (!oldestShownTime || event.created_at > oldestShownTime)
        ) {
          // set to "new events" queue
          setNewEvents((prev) => new Map([...prev, [event.id, event]]))
          setNewEventsFrom((prev) => new Set([...prev, event.pubkey]))
        } else {
          // update feed right away
          eventsRef.current.set(event.id, event)
          if (!initialLoadDone.current) {
            debouncedInitialLoadDone()
          }
        }
      }
    })

    return () => {
      sub.stop()
    }
  }, [JSON.stringify(localFilter)])

  useEffect(() => {
    eventsRef.current.size &&
      !feedCache.has(cacheKey) &&
      feedCache.set(cacheKey, eventsRef.current)
  }, [eventsRef.current.size])

  useEffect(() => {
    // if just changed to different feed, display all new events
    initialLoadDone.current = false
  }, [cacheKey, fetchFilterFn, displayFilterFn])

  const filterEvents = useCallback(
    (event: NDKEvent) => {
      if (!event.created_at) return false
      if (displayFilterFn && !displayFilterFn(event)) return false
      if (
        hideEventsByUnknownUsers &&
        socialGraph().getFollowDistance(event.pubkey) >= 5 &&
        !(filters.authors && filters.authors.includes(event.pubkey))
      ) {
        return false
      }
      return true
    },
    [displayFilterFn, myPubKey, hideEventsByUnknownUsers, filters.authors]
  )

  const filteredEvents = useMemo(() => {
    return Array.from(eventsRef.current.values()).filter(filterEvents)
  }, [eventsRef.current.size, filterEvents, feedFilter, cacheKey])

  const eventsByUnknownUsers = useMemo(() => {
    if (!hideEventsByUnknownUsers) {
      return []
    }
    return Array.from(eventsRef.current.values()).filter(shouldHideEvent)
  }, [eventsRef.current.size])

  const newEventsFiltered = Array.from(newEvents.values()).filter(filterEvents)

  const loadMoreItems = () => {
    if (filteredEvents.length > displayCount) {
      setDisplayCount(displayCount + DISPLAY_INCREMENT)
    } else if (localFilter.until !== oldestRef.current) {
      setLocalFilter((prev) => ({
        ...prev,
        until: oldestRef.current,
      }))
    }
  }

  const firstFeedItemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // This effect will run whenever forceUpdate changes, triggering a re-render
    if (forceUpdate !== undefined) {
      setForceUpdate((prev) => prev + 1)
    }
  }, [forceUpdate])

  const mediaEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const hasImageUrl = imageEmbed.regex.test(event.content)
      const hasVideoUrl = Video.regex.test(event.content)

      return hasImageUrl || hasVideoUrl
    })
  }, [filteredEvents])

  return (
    <>
      <DisplayAsSelector
        activeSelection={displayAs}
        onSelect={(display) => {
          setDisplayAs(display)
          onDisplayAsChange?.(display)
        }}
      />

      {newEventsFiltered.length > 0 && (
        <NewEventsButton
          newEventsFiltered={newEventsFiltered}
          newEventsFrom={newEventsFrom}
          showNewEvents={showNewEvents}
          firstFeedItemRef={firstFeedItemRef}
        />
      )}

      <div>
        {filteredEvents.length > 0 &&
          (displayAs === "grid" ? (
            <div className="grid grid-cols-3 gap-px md:gap-1">
              {mediaEvents.map((event, index) => (
                <ImageGridItem
                  key={event.id}
                  event={event}
                  index={index}
                  setActiveItemIndex={(index) => {
                    // Implement modal/lightbox logic here
                  }}
                />
              ))}
            </div>
          ) : (
            <InfiniteScroll onLoadMore={loadMoreItems}>
              {filteredEvents.slice(0, displayCount).map((event, index) => (
                <div key={event.id} ref={index === 0 ? firstFeedItemRef : null}>
                  <FeedItem
                    asReply={asReply || showRepliedTo}
                    showRepliedTo={showRepliedTo}
                    showReplies={showReplies}
                    event={event}
                    onEvent={onEvent}
                    borderTop={borderTopFirst && index === 0}
                  />
                </div>
              ))}
            </InfiniteScroll>
          ))}
        {filteredEvents.length === 0 &&
          newEventsFiltered.length === 0 &&
          initialLoadDone.current &&
          emptyPlaceholder}
        {showEventsByUnknownUsersButton &&
          myPubKey &&
          eventsByUnknownUsers.length > 0 && (
            <div
              className="p-4 border-t border-b border-custom text-info text-center transition-colors duration-200 ease-in-out hover:underline hover:bg-[var(--note-hover-color)] cursor-pointer"
              onClick={() => setShowEventsByUnknownUsers(!showEventsByUnknownUsers)}
            >
              {showEventsByUnknownUsers ? "Hide" : "Show"} {eventsByUnknownUsers.length}{" "}
              events by unknown users
            </div>
          )}
        {showEventsByUnknownUsers && eventsByUnknownUsers.length > 0 && (
          <UnknownUserEvents
            eventsByUnknownUsers={eventsByUnknownUsers}
            showRepliedTo={showRepliedTo}
            asReply={true}
          />
        )}
      </div>
    </>
  )
}

export default Feed

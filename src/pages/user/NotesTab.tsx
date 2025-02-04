import {NDKFilter, NDKEvent} from "@nostr-dev-kit/ndk"
import Feed from "@/shared/components/feed/Feed.tsx"
import {useMemo} from "react"

interface NotesTabProps {
  pubKey: string
  filters?: NDKFilter
  displayFilterFn?: (event: NDKEvent) => boolean
  showRepliedTo?: boolean
  kinds: number[]
}

function NotesTab({
  pubKey,
  filters,
  displayFilterFn,
  showRepliedTo = false,
  kinds,
}: NotesTabProps) {
  // memoize so it doesn't change and cause reinit of feed
  const myFilters: NDKFilter = useMemo(
    () =>
      filters || {
        kinds: kinds,
        authors: [pubKey || ""],
      },
    [pubKey, kinds]
  )

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex-1">
        <Feed
          showRepliedTo={showRepliedTo}
          filters={myFilters}
          displayFilterFn={displayFilterFn}
          borderTopFirst={true}
        />
      </div>
    </div>
  )
}

export default NotesTab

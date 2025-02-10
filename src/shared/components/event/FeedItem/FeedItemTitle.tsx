import useProfile from "@/shared/hooks/useProfile.ts"
import { NDKEvent } from "@nostr-dev-kit/ndk"
import { Helmet } from "react-helmet"
import { useMemo } from "react"

type FeedItemTitleProps = {
  event?: NDKEvent
}

const FeedItemTitle = ({ event }: FeedItemTitleProps) => {
  const authorProfile = useProfile(event?.pubkey)

  const authorTitle = useMemo(() => {
    const name =
      authorProfile?.name ||
      authorProfile?.display_name ||
      authorProfile?.username ||
      authorProfile?.nip05?.split("@")[0]
    return name ? `Post by ${name}` : "Post"
  }, [authorProfile])

  return (
    <Helmet>
      <title>{authorTitle}</title>
    </Helmet>
  )
}

export default FeedItemTitle

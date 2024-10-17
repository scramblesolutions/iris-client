import {Check, ContentCopy} from "@mui/icons-material"
import {NDKEvent} from "@nostr-dev-kit/ndk"
import {Button} from "@mui/material"
import {useState} from "react"

type RawJSONProps = {
  event: NDKEvent
}

function RawJSON({event}: RawJSONProps) {
  const [copied, setCopied] = useState(false)

  const rawEvent = {
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    kind: event.kind,
    pubkey: event.pubkey,
    id: event.id,
    sig: event.sig,
  }

  const handleCopyRawJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(rawEvent, null, 4))
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 3000)
  }

  return (
    <div className="flex flex-col justify-center select-text">
      <pre>{JSON.stringify(rawEvent, null, 4)}</pre>
      <Button className="btn" onClick={handleCopyRawJSON}>
        {!copied && <ContentCopy />}
        {copied && <Check />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

export default RawJSON

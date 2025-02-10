import { ElementType, ReactNode, useEffect, useMemo, useState } from "react"
import { ErrorOutline, GitHub, Verified } from "@mui/icons-material"
import { NDKUserProfile } from "@nostr-dev-kit/ndk"
import { useNavigate } from "react-router-dom"
import { nip19 } from "nostr-tools"
import { ndk } from "irisdb-nostr"

import HyperText from "@/shared/components/HyperText.tsx"
import MutedBy from "@/shared/components/user/MutedBy"
import { unmuteUser } from "@/shared/services/Mute"
import Icon from "@/shared/components/Icons/Icon"
import useMutes from "@/shared/hooks/useMutes"

const Bolt = () => <Icon name="zap-solid" className="text-accent" />
const Link = () => <Icon name="link-02" className="text-info" />

type ExternalIdentities = {
  github: string
}

interface ProfileDetailsProps {
  displayProfile: NDKUserProfile | undefined
  externalIdentities: ExternalIdentities | undefined
  pubKey: string
}

function ProfileDetails({
  displayProfile,
  externalIdentities,
  pubKey,
}: ProfileDetailsProps) {
  const navigate = useNavigate()
  const [nip05valid, setNIP05valid] = useState(null as boolean | null)
  const website = useMemo(() => {
    try {
      if (displayProfile?.website) {
        return new URL(displayProfile.website).toString()
      }
    } catch (e) {
      // ignore
    }
    return null
  }, [displayProfile])

  const npub = useMemo(() => {
    if (pubKey) {
      try {
        const npub = pubKey.startsWith("npub") ? pubKey : nip19.npubEncode(pubKey)
        return npub
      } catch (error) {
        console.warn(error)
        navigate("/404")
      }
    }
    return ""
  }, [pubKey, navigate])
  const hexPub = useMemo(() => {
    if (pubKey) {
      try {
        return pubKey.startsWith("npub") ? String(nip19.decode(pubKey).data) : pubKey
      } catch (error) {
        console.warn(error)
        navigate("/404")
      }
    }
    return ""
  }, [pubKey, navigate])

  const mutes = useMutes()
  useMutes(hexPub) // update their mute list
  const isMuted = useMemo(() => mutes.includes(hexPub), [mutes, hexPub])

  useEffect(() => {
    if (npub && displayProfile?.nip05) {
      ndk()
        ?.getUser({ npub })
        ?.validateNip05(displayProfile.nip05)
        .then((isValid) => {
          setNIP05valid(isValid ?? false)
          if (isValid && displayProfile.nip05?.endsWith("@iris.to")) {
            const currentPath = window.location.pathname.split("/").slice(2).join("/")
            const basePath = displayProfile.nip05.replace("@iris.to", "")
            const newPath = currentPath ? `/${basePath}/${currentPath}` : `/${basePath}`

            if (window.location.pathname !== newPath) {
              navigate(newPath, { replace: true })
            }
          }
        })
        .catch((error) => console.warn(error))
    }
  }, [npub, displayProfile])

  const renderProfileField = (
    IconComponent: ElementType,
    content: string | ReactNode,
    key: string
  ) => (
    <div key={key} className="flex items-center gap-2">
      <IconComponent className="text-primary" />
      <small>{content}</small>
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {isMuted && (
        <div className="flex items-center gap-2 text-warning">
          <ErrorOutline className="text-warning" />
          <small>User is muted</small>
          <button className="btn btn-sm btn-neutral" onClick={() => unmuteUser(hexPub)}>
            Unmute
          </button>
        </div>
      )}
      <MutedBy pubkey={hexPub} />
      {displayProfile?.nip05 && (
        <div className={nip05valid === null ? "invisible" : "visible"}>
          {renderProfileField(
            nip05valid ? Verified : ErrorOutline,
            nip05valid ? (
              displayProfile.nip05.replace("_@", "")
            ) : (
              <s>{String(displayProfile.nip05).replace("_@", "")}</s>
            ),
            "nip05"
          )}
        </div>
      )}
      {website &&
        renderProfileField(
          Link,
          <a href={website} target="_blank" className="link" rel="noreferrer">
            {website.replace(/https?:\/\//, "").replace(/\/$/, "")}
          </a>,
          "website"
        )}
      {externalIdentities?.github &&
        renderProfileField(GitHub, externalIdentities.github, "github")}
      {displayProfile?.lud16 && renderProfileField(Bolt, displayProfile.lud16, "lud16")}
      {displayProfile?.about && (
        <article className="prose">
          <HyperText small={true} truncate={100}>
            {displayProfile.about}
          </HyperText>
        </article>
      )}
    </div>
  )
}

export default ProfileDetails

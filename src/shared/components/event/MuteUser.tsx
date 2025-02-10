import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Hexpubkey, NDKEvent, NDKTag } from "@nostr-dev-kit/ndk"

import { muteUser, unmuteUser } from "@/shared/services/Mute.tsx"
import { UserRow } from "@/shared/components/user/UserRow.tsx"
import socialGraph from "@/utils/socialGraph.ts"
import { ndk } from "irisdb-nostr"

interface MuteUserProps {
  setMuting: Dispatch<SetStateAction<boolean>>
  user: Hexpubkey
  event?: NDKEvent
  muteState: boolean
  setMutedState: Dispatch<SetStateAction<boolean>>
}

function MuteUser({ user, setMuting, muteState }: MuteUserProps) {
  const [muted, setMuted] = useState<boolean>(false)

  // Placeholder for missing function
  const setMutedList = (list: string[]) => {
    console.log(list) // TODO: Implement the actual logic
  }

  // Placeholder for missing function
  const setPublishingError = (error: boolean) => {
    console.log(error) // TODO: Implement the actual logic
  } // TODO: Define or import the actual setPublishingError function

  useEffect(() => {
    setMuted(muteState)
  }, [muteState])

  const handleClose = () => {
    setMuting(false)
  }

  const handleMuteUser = async () => {
    const followDistance = socialGraph().getFollowDistance(user)
    if (followDistance === 1) {
      // Unfollow the user if they are being followed
      const event = new NDKEvent(ndk())
      event.kind = 3
      const followedUsers = socialGraph().getFollowedByUser(socialGraph().getRoot())
      followedUsers.delete(user)
      event.tags = Array.from(followedUsers).map((pubKey) => ["p", pubKey]) as NDKTag[]
      event.publish().catch((e) => console.warn("Error publishing unfollow event:", e))
    }

    muteUser(user)
      .then((newList) => {
        localStorage.setItem("mutedIds", JSON.stringify(newList))
      })
      .catch(() => setPublishingError(false))
  }

  const handleUnmuteUser = async () => {
    try {
      await unmuteUser(user)
        .then((newList) => {
          setMutedList(newList)
          setMuted(false)
          localStorage.setItem("mutedIds", JSON.stringify(newList))
        })
        .catch(() => {
          //error message printed in muteUser
          setPublishingError(false)
        })
    } catch (error) {
      // Ignore
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold mb-4">Mute User</h1>
        <div>
          {muted ? (
            <div className="flex flex-col items-center">
              <div>User Muted</div>
              <button onClick={handleUnmuteUser} className="btn btn-neutral mt-2">
                Undo?
              </button>
            </div>
          ) : (
            <>
              <div>
                <p>Are you sure you want to mute:</p>
                <div className="flex items-center mt-4">
                  <UserRow pubKey={user} />
                </div>
              </div>
              <div className="flex mt-4">
                <button onClick={handleClose} className="btn btn-neutral mr-2">
                  No
                </button>
                <button onClick={handleMuteUser} className="btn btn-primary">
                  Yes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MuteUser

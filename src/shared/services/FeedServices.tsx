import NDK, {Hexpubkey, NDKEvent} from "@nostr-dev-kit/ndk"

export const muteUser = async (
  ndk: NDK,
  mutedList: string[],
  pubkey: string
): Promise<string[]> => {
  // Check if pubkey already exists in the list before adding
  const newList = mutedList.includes(pubkey) ? mutedList : [...mutedList, pubkey]
  const newTags = newList.map((entry: string) => ["p", entry])

  const muteEvent = new NDKEvent(ndk)
  muteEvent.kind = 10000
  muteEvent.tags = newTags

  try {
    await muteEvent.publish()
    return newList
  } catch (error) {
    console.warn("Unable to mute user", error)
    return mutedList
  }
}

export const unmuteUser = async (
  ndk: NDK,
  mutedList: string[],
  pubkey: string
): Promise<string[]> => {
  const newList = mutedList.filter((entry: string) => entry !== pubkey)
  const newTags = newList.map((entry: string) => ["p", entry])

  const unmuteEvent = new NDKEvent(ndk)
  unmuteEvent.kind = 10000
  unmuteEvent.tags = newTags

  try {
    await unmuteEvent.publish()
    return newList
  } catch (error) {
    console.warn("Unable to unmute user", error)
    return mutedList
  }
}

export const submitReport = async (
  ndk: NDK,
  reason: string,
  content: string,
  pubkey: Hexpubkey, //pubkey needed
  id?: string //event optional
) => {
  const reportEvent = new NDKEvent(ndk)
  reportEvent.kind = 1984
  reportEvent.content = content

  reportEvent.tags = id
    ? [
        ["e", id, reason],
        ["p", pubkey],
      ]
    : [["p", pubkey, reason]]
  try {
    await reportEvent.publish()
  } catch (error) {
    console.warn("Unable to send report", error)
    return Promise.reject(error)
  }
}

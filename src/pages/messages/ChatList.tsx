import {UserRow} from "@/shared/components/user/UserRow"
import {useLocalState} from "irisdb-hooks"
import {NavLink} from "react-router-dom"
import classNames from "classnames"
import {nip19} from "nostr-tools"

interface ChatListProps {
  className?: string
}

type Channel = {
  messages: string[]
}

const ChatListItem = ({id}: {id: string}) => {
  return (
    <NavLink
      to={`/messages/${nip19.npubEncode(id)}`}
      key={id}
      className={({isActive}) =>
        classNames("p-2 flex items-center border-b border-custom", {
          "bg-base-300": isActive,
          "hover:bg-base-300": !isActive,
        })
      }
    >
      <div className="flex flex-col">
        <span className="text-base font-semibold">
          <UserRow pubKey={id} linkToProfile={false} />
        </span>
      </div>
    </NavLink>
  )
}

const ChatList = ({className}: ChatListProps) => {
  const [channels] = useLocalState("channels", {} as Record<string, Channel>)
  return (
    <nav className={className}>
      <div className="flex flex-col">
        <NavLink
          to="/messages/new"
          end
          className={({isActive}) =>
            classNames("p-4 flex items-center border-b border-custom", {
              "bg-base-300": isActive,
              "hover:bg-base-300": !isActive,
            })
          }
        >
          <div className="flex flex-col">
            <span className="text-base font-semibold">New Chat</span>
            <span className="text-sm text-base-content/70">Start a new conversation</span>
          </div>
        </NavLink>
        {Object.keys(channels).map((id) => (
          <ChatListItem key={id} id={id} />
        ))}
      </div>
    </nav>
  )
}

export default ChatList

import UnseenNotificationsBadge from "@/shared/components/header/UnseenNotificationsBadge.tsx"
import PublishButton from "@/shared/components/ui/PublishButton.tsx"
import {useRef, ReactNode, MouseEventHandler, useMemo} from "react"
import {UserRow} from "@/shared/components/user/UserRow.tsx"
import Icon from "@/shared/components/Icons/Icon"
import {npubEncode} from "nostr-tools/nip19"
import {useLocalState} from "irisdb-hooks"
import {Login} from "@mui/icons-material"
import classNames from "classnames"
import NavLink from "./NavLink"

import PublicKeyQRCodeButton from "./user/PublicKeyQRCodeButton"

interface NavItemProps {
  to: string
  icon?: string
  activeIcon?: string
  inactiveIcon?: string
  label: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  children?: ReactNode
  className?: string
}

const NavItem = ({
  to,
  icon,
  activeIcon,
  inactiveIcon,
  label,
  onClick,
  children,
  className,
}: NavItemProps) => (
  <li>
    <NavLink
      title={label}
      to={to}
      onClick={onClick}
      className={({isActive}) =>
        classNames(className, {
          "bg-base-100": isActive,
          "rounded-full md:aspect-square xl:aspect-auto flex md:justify-center xl:justify-start items-center":
            true,
        })
      }
    >
      {({isActive}) => (
        <>
          <Icon
            className="w-6 h-6"
            name={
              (isActive ? activeIcon : inactiveIcon) ||
              (icon ? `${icon}-${isActive ? "solid" : "outline"}` : "")
            }
          />
          <span className="inline md:hidden xl:inline">{label}</span>
          {children}
        </>
      )}
    </NavLink>
  </li>
)

const NotificationNavItem = ({
  to,
  onClick,
}: {
  to: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}) => (
  <li>
    <NavLink
      title="Notifications"
      to={to}
      onClick={onClick}
      className={({isActive}) =>
        classNames({
          "bg-base-100": isActive,
          "rounded-full md:aspect-square xl:aspect-auto flex items-center": true,
        })
      }
    >
      {({isActive}) => (
        <span className="indicator flex items-center gap-2">
          <UnseenNotificationsBadge />
          <Icon name={`bell-${isActive ? "solid" : "outline"}`} className="w-6 h-6" />
          <span className="inline md:hidden xl:inline">Notifications</span>
        </span>
      )}
    </NavLink>
  </li>
)

const navItemsConfig = (myPubKey: string) => ({
  home: {to: "/", icon: "home", label: "Home"},
  wallet: {
    to: "/wallet",
    activeIcon: "wallet",
    inactiveIcon: "wallet",
    label: "Wallet",
    requireLogin: true,
  },
  messages: {
    to: "/messages",
    icon: "mail",
    label: "Messages",
    requireLogin: true,
  },
  notifications: {
    to: "/notifications",
    icon: "notifications",
    label: "Notifications",
    requireLogin: true,
  },
  organizations: {
    to: "/organizations",
    activeIcon: "user-v2",
    inactiveIcon: "user-v2",
    label: "Organizations",
    requireLogin: true,
  },
  repositories: {
    to: `/${npubEncode(myPubKey)}/code`,
    activeIcon: "hard-drive",
    inactiveIcon: "hard-drive",
    label: "Repositories",
    requireLogin: true,
  },
  settings: {to: "/settings", icon: "settings", label: "Settings", requireLogin: true},
  about: {to: "/about", icon: "info", label: "About"},
  search: {to: "/search", icon: "search", label: "Search"},
})

const NavSideBar = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [myPubKey] = useLocalState("user/publicKey", "")
  const [isSidebarOpen, setIsSidebarOpen] = useLocalState("isSidebarOpen", false)
  const [, setShowLoginDialog] = useLocalState("home/showLoginDialog", false)

  const navItems = useMemo(() => {
    const configItems = navItemsConfig(myPubKey)
    return (CONFIG.navItems as Array<keyof typeof configItems>)
      .map((key) => configItems[key])
      .filter((item) => !("requireLogin" in item) || (item.requireLogin && myPubKey))
  }, [myPubKey])

  const logoUrl = CONFIG.navLogo

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div
        ref={ref}
        className={classNames(
          "bg-base-200 transition-transform duration-300 fixed md:sticky md:translate-x-0 top-0 select-none w-56 md:w-20 xl:w-64 h-screen z-40 flex flex-col justify-between gap-4 border-r border-custom overflow-y-auto",
          {
            "translate-x-0": isSidebarOpen,
            "-translate-x-full": !isSidebarOpen,
          }
        )}
      >
        <div className="flex flex-col items-start md:items-center xl:items-start gap-4 md:gap-2 xl:gap-4">
          <NavLink
            className="md:mb-2 xl:mb-0 mt-4 ml-4 md:ml-0 xl:ml-5 flex flex-row gap-2 items-center md:justify-center font-bold font-bold text-3xl"
            to="/"
          >
            <img className="w-8 h-8" src={logoUrl} />
            <span className="inline md:hidden xl:inline">{CONFIG.appName}</span>
          </NavLink>
          <ul className="menu px-2 py-0 text-xl flex flex-col gap-4 md:gap-2 xl:gap-4 rounded-2xl">
            {navItems.map(
              ({
                to,
                icon,
                activeIcon,
                inactiveIcon,
                label,
                onClick,
              }: {
                to: string
                icon?: string
                activeIcon?: string
                inactiveIcon?: string
                label: string
                onClick?: MouseEventHandler<HTMLAnchorElement>
              }) =>
                label === "Notifications" ? (
                  <NotificationNavItem key={to} to={to} onClick={onClick} />
                ) : (
                  <NavItem
                    key={to}
                    to={to}
                    icon={icon}
                    activeIcon={activeIcon}
                    inactiveIcon={inactiveIcon}
                    label={label}
                    onClick={onClick}
                  />
                )
            )}
          </ul>
          {myPubKey && (
            <div className="ml-2 md:ml-0 xl:ml-2 md:mt-2 xl:mt-0">
              <div className="hidden md:flex">
                <PublishButton />
              </div>
              <div className="md:hidden p-2" onClick={(e) => e.stopPropagation()}>
                <PublicKeyQRCodeButton publicKey={myPubKey} />
              </div>
            </div>
          )}
          {!myPubKey && (
            <>
              <button
                className="ml-2 md:ml-0 hidden md:flex xl:hidden btn btn-primary btn-circle items-center justify-center"
                onClick={() => setShowLoginDialog(true)}
              >
                <Login className="w-5 h-5" />
              </button>
              <button
                className="ml-2 flex md:hidden xl:flex btn btn-primary items-center gap-2"
                onClick={() => setShowLoginDialog(true)}
              >
                <Login className="w-5 h-5" />
                <span>Sign up</span>
              </button>
            </>
          )}
        </div>
        {myPubKey && (
          <div className="hidden md:flex p-4 md:mb-2 xl:mb-6">
            <UserRow
              pubKey={myPubKey}
              showBadge={false}
              textClassName="md:hidden xl:inline font-bold"
              avatarWidth={45}
            />
          </div>
        )}
      </div>
    </>
  )
}

export default NavSideBar

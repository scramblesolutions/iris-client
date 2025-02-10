import { NavLink as RouterNavLink, NavLinkProps, useLocation } from "react-router-dom"
import { localState } from "irisdb"
import { MouseEvent } from "react"

export default function NavLink(props: NavLinkProps) {
  const { to, onClick, ...rest } = props
  const location = useLocation()

  const isActive = location.pathname === to.toString()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event)
    }

    if (isActive) {
      if (window.scrollY === 0) {
        localState.get("refreshRouteSignal").put(Date.now())
      } else {
        window.scrollTo({ top: 0, behavior: "instant" })
      }
    }
  }

  return <RouterNavLink to={to} onClick={handleClick} {...rest} />
}

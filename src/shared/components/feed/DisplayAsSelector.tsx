import Icon from "../Icons/Icon"

export type DisplayAs = "list" | "grid"

type DisplaySelectorProps = {
  activeSelection: DisplayAs
  onSelect: (display: DisplayAs) => void
  show?: boolean
}

export const DisplayAsSelector = ({
  activeSelection,
  onSelect,
  show = true,
}: DisplaySelectorProps) => {
  const getClasses = (displayType: DisplayAs) => {
    const baseClasses = "border-highlight cursor-pointer flex justify-center flex-1 p-3"
    return activeSelection === displayType
      ? `${baseClasses} border-b border-1`
      : `${baseClasses} text-base-content/70 hover:text-base-content border-b border-1 border-transparent`
  }

  if (!show) return null

  return (
    <div className="flex mb-px md:mb-1">
      <div className={getClasses("list")} onClick={() => onSelect("list")}>
        <span className="rotate-90">
          <Icon name="deck-solid" />
        </span>
      </div>
      <div className={getClasses("grid")} onClick={() => onSelect("grid")}>
        <Icon name="media" />
      </div>
    </div>
  )
}

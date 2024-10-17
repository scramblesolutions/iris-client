import {Dispatch, MouseEvent, ReactNode, SetStateAction} from "react"
import Modal from "@/shared/components/ui/Modal.tsx"

type PopupProps = {
  children: ReactNode
  setOpen?: Dispatch<SetStateAction<boolean>>
}

function Popup({children, setOpen}: PopupProps) {
  const handleClose = () => {
    if (setOpen) setOpen(false)
  }

  // prevent modal close when clicking inside the popup component
  const handleContentClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  return (
    <div className="z-50" onClick={handleContentClick}>
      <Modal onClose={handleClose}>{children}</Modal>
    </div>
  )
}

export default Popup

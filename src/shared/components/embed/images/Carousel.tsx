import {RiArrowLeftSLine, RiArrowRightSLine} from "@remixicon/react"
import ProxyImg from "@/shared/components/ProxyImg.tsx"
import {useEffect, useState, MouseEvent, useCallback} from "react"
import Modal from "@/shared/components/ui/Modal.tsx"
import Icon from "@/shared/components/Icons/Icon"
import ImageComponent from "./ImageComponent"
import {useSwipeable} from "react-swipeable"
import {NDKEvent} from "@nostr-dev-kit/ndk"
import {localState} from "irisdb"

interface CarouselProps {
  images: string[]
  event?: NDKEvent
}

function Carousel({images, event}: CarouselProps) {
  let blurNSFW = true
  localState.get("settings/blurNSFW").on((value) => {
    if (typeof value === "boolean") {
      blurNSFW = value
    }
  })

  const CarouselButton = ({
    direction,
    onClick,
  }: {
    direction: "left" | "right"
    onClick: (e: MouseEvent<HTMLButtonElement>) => void
  }) => (
    <button
      onClick={(e) => onClick(e as MouseEvent<HTMLButtonElement>)}
      className={`absolute top-1/2 ${direction === "left" ? "left-0" : "right-0"} transform -translate-y-1/2 bg-gray-800 rounded-full opacity-50 text-white p-2`}
    >
      {direction === "left" ? (
        <RiArrowLeftSLine size={24} />
      ) : (
        <RiArrowRightSLine size={24} />
      )}
    </button>
  )

  const ImageIndicators = ({
    images,
    currentIndex,
  }: {
    images: string[]
    currentIndex: number
  }) => (
    <div className="flex space-x-2 mt-2">
      {images.map((_, index) => (
        <span
          key={index}
          className={`h-2 w-2 rounded-full ${index === currentIndex ? "bg-primary" : "bg-gray-300"}`}
        />
      ))}
    </div>
  )

  const PreloadImages = ({
    images,
    currentIndex,
    size,
  }: {
    images: string[]
    currentIndex: number
    size: number | null
  }) => (
    <div className="hidden">
      <ProxyImg
        src={images[(currentIndex + 1) % images.length]}
        width={size ?? undefined}
      />
      <ProxyImg
        src={images[(currentIndex - 1 + images.length) % images.length]}
        width={size ?? undefined}
      />
    </div>
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [blur, setBlur] = useState(
    blurNSFW &&
      (!!event?.content.toLowerCase().includes("#nsfw") ||
        event?.tags.some((t) => t[0] === "content-warning"))
  )
  const [showModal, setShowModal] = useState(false)

  const nextImage = (e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const prevImage = (e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  const onClickImage = () => {
    if (blur) {
      setBlur(false)
    } else {
      setShowModal(true)
    }
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => nextImage(),
    onSwipedRight: () => prevImage(),
    preventScrollOnSwipe: true,
    trackMouse: true,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextImage(e)
      } else if (e.key === "ArrowLeft") {
        prevImage(e)
      }
    }

    if (showModal) {
      window.addEventListener("keydown", handleKeyDown)
    } else {
      window.removeEventListener("keydown", handleKeyDown)
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [showModal])

  const onCloseModal = useCallback(() => {
    setShowModal(false)
  }, [])

  return (
    <div
      {...handlers} // Add swipe handlers here
      className={`relative w-full h-96 max-h-screen my-2 flex flex-col items-${images.length > 1 ? "center" : "start"}`}
    >
      <ImageComponent
        match={images[currentIndex]}
        index={currentIndex}
        onClickImage={onClickImage}
        blur={blur}
      />
      {images.length > 1 && (
        <>
          <CarouselButton direction="left" onClick={prevImage} />
          <CarouselButton direction="right" onClick={nextImage} />
          <ImageIndicators images={images} currentIndex={currentIndex} />
        </>
      )}
      {showModal && (
        <Modal hasBackground={false} onClose={onCloseModal}>
          <button
            className="btn btn-circle btn-ghost absolute right-2 top-2 focus:outline-none"
            onClick={() => setShowModal(false)}
          >
            <Icon name="close" size={12} />
          </button>
          <ProxyImg
            className="max-h-[100vh] max-w-[100vw] cursor-pointer"
            src={images[currentIndex]}
            onClick={() => setShowModal(false)}
          />
          {images.length > 1 && (
            <div className="absolute top-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
              {currentIndex + 1} / {images.length}
            </div>
          )}
          {images.length > 1 && (
            <>
              <CarouselButton direction="left" onClick={prevImage} />
              <CarouselButton direction="right" onClick={nextImage} />
              <PreloadImages images={images} currentIndex={currentIndex} size={null} />
            </>
          )}
        </Modal>
      )}
      <PreloadImages images={images} currentIndex={currentIndex} size={600} />
    </div>
  )
}

export default Carousel

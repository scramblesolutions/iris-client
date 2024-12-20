import {useNavigate} from "react-router-dom"
import {NDKEvent} from "@nostr-dev-kit/ndk"
import {nip19} from "nostr-tools"

import imageEmbed from "@/shared/components/embed/images/Image"
import Video from "@/shared/components/embed/video/Video"
import ProxyImg from "@/shared/components/ProxyImg"

type ImageGridItemProps = {
  event: NDKEvent
  index: number
  setActiveItemIndex: (index: number) => void
  lastElementRef?: React.MutableRefObject<HTMLDivElement>
}

export const ImageGridItem = ({
  event,
  index,
  setActiveItemIndex,
  lastElementRef,
}: ImageGridItemProps) => {
  const navigate = useNavigate()

  const imageMatch = event.content.match(imageEmbed.regex)?.[0]
  const videoMatch = event.content.match(Video.regex)?.[0]

  const url = imageMatch || videoMatch
  if (!url) return null

  const isVideo = videoMatch
  const proxyUrl = isVideo ? `https://imgproxy.iris.to/thumbnail/638/${url}` : url

  return (
    <div
      key={`feed${url}${index}`}
      className="aspect-square cursor-pointer relative bg-neutral-300 hover:opacity-80"
      onClick={() => {
        if (window.innerWidth > 640) {
          setActiveItemIndex(index)
        } else {
          navigate(`/${nip19.npubEncode(event.id)}`)
        }
      }}
      ref={lastElementRef}
    >
      <ProxyImg
        square={true}
        width={319}
        src={proxyUrl}
        alt=""
        className="w-full h-full object-cover"
      />
      {isVideo && (
        <div className="absolute top-0 right-0 m-2 shadow-md shadow-gray-500">
          {/* Add your video icon here */}vid
        </div>
      )}
    </div>
  )
}

export default ImageGridItem

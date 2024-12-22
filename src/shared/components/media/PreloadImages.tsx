import ProxyImg from "../ProxyImg"

interface PreloadImagesProps {
  images: string[]
  currentIndex: number
  size?: number | null
}

function PreloadImages({images, currentIndex, size}: PreloadImagesProps) {
  return (
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
}

export default PreloadImages 
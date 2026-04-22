import { useEffect, useMemo, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { buildProductPlaceholder, normalizeProductImageSrc } from '../lib/productImages'

export default function ProductImage({
  src,
  title,
  alt,
  wrapperClassName,
  imageClassName,
  fallbackClassName,
}) {
  const placeholderSrc = useMemo(() => buildProductPlaceholder(title), [title])
  const normalizedSrc = useMemo(
    () => normalizeProductImageSrc(src, title),
    [src, title],
  )
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc)

  useEffect(() => {
    setCurrentSrc(normalizedSrc)
  }, [normalizedSrc])

  if (!currentSrc) {
    return (
      <div className={fallbackClassName}>
        <div className="flex flex-col items-center gap-2 text-center">
          <ImageIcon size={22} className="text-text-muted" />
          <p className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Image Unavailable
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperClassName}>
      <img
        src={currentSrc}
        alt={alt || title}
        className={imageClassName}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (currentSrc !== placeholderSrc) {
            setCurrentSrc(placeholderSrc)
          }
        }}
      />
    </div>
  )
}

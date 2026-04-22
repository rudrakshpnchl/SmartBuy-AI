import { ExternalLink, Heart, Star, Truck, Package, ShieldCheck } from 'lucide-react'
import { useWishlist } from '../hooks/useWishlist'
import ProductImage from './ProductImage'

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

function StarRating({ rating }) {
  const full = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= full
              ? 'text-gold fill-gold'
              : hasHalf && i === full + 1
              ? 'text-gold-dim fill-gold-dim'
              : 'text-text-muted'
          }
        />
      ))}
      <span className="ml-1 text-xs text-text-secondary font-mono">{rating.toFixed(1)}</span>
    </div>
  )
}

export default function ProductCard({ product, rank, isBest, style }) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const {
    title, price, currency, rating, source, url,
    delivery, reviews_count, in_stock, relevance_score, thumbnail, snippet
  } = product
  const wishlisted = isWishlisted(product)

  return (
    <article
      style={style}
      className={`
        relative rounded-2xl border p-3 card-hover animate-fade-up
        ${isBest
          ? 'border-accent bg-gradient-to-br from-surface via-surface to-[#1a1830] shadow-glow-accent'
          : 'border-border bg-surface'
        }
      `}
    >
      {/* Best badge */}
      {isBest && (
        <div className="absolute -top-3 left-5 flex items-center gap-1.5
          px-3 py-1 rounded-full bg-accent text-white text-xs font-display font-semibold
          shadow-glow-accent">
          <ShieldCheck size={12} />
          AI Best Pick
        </div>
      )}

      {/* Rank badge */}
      {!isBest && (
        <div className="absolute top-4 left-4 z-10 w-7 h-7 rounded-full bg-void/95 border border-border
          flex items-center justify-center text-xs text-text-muted font-mono">
          #{rank}
        </div>
      )}

      {/* Header */}
      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className={`
            absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full
            border backdrop-blur-sm transition-all duration-200
            ${wishlisted
              ? 'border-rose-400/50 bg-rose-500/15 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.22)]'
              : 'border-white/15 bg-[#09090dcc] text-white/80 hover:border-rose-300/40 hover:text-rose-300'
            }
          `}
          aria-label={wishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={18} className={wishlisted ? 'fill-current' : ''} />
        </button>

        <ProductImage
          src={thumbnail}
          title={title}
          alt={title}
          wrapperClassName="overflow-hidden rounded-xl border border-border bg-void/60"
          imageClassName="h-32 w-full object-cover"
          fallbackClassName="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-void/60"
        />
      </div>

      <div className="mt-1 mb-2">
        <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1 mt-1">{source}</p>
        <h3 className="font-display font-semibold text-text-primary text-sm leading-snug line-clamp-2">
          {title}
        </h3>
        {snippet && (
          <p className="mt-1 text-[10px] text-text-muted leading-relaxed line-clamp-2">
            {snippet}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mb-2">
        <span className={`text-xl font-display font-bold ${isBest ? 'text-gold' : 'text-text-primary'}`}>
          {formatPrice(price, currency)}
        </span>
      </div>

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={rating} />
        {reviews_count > 0 && (
          <p className="mt-0.5 text-xs text-text-muted">
            {reviews_count.toLocaleString()} reviews
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Truck size={12} className="text-accent" />
          {delivery}
        </span>
        <span className={`flex items-center gap-1.5 ${in_stock ? 'text-emerald-400' : 'text-red-400'}`}>
          <Package size={12} />
          {in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>

      {/* Relevance bar */}
      {relevance_score !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Relevance</span>
            <span className="text-text-secondary font-mono">{(relevance_score * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-void overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isBest ? 'bg-accent' : 'bg-border'}`}
              style={{ width: `${relevance_score * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-display font-semibold
          transition-all duration-200 active:scale-95
          ${isBest
            ? 'bg-accent text-white hover:bg-accent-glow'
            : 'bg-void border border-border text-text-secondary hover:border-accent hover:text-accent'
          }
        `}
      >
        View Deal
        <ExternalLink size={14} />
      </a>
    </article>
  )
}

import { ArrowLeft, Heart, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useWishlist } from '../hooks/useWishlist'

export default function Wishlist() {
  const navigate = useNavigate()
  const { items, wishlistCount } = useWishlist()

  return (
    <div className="min-h-screen bg-obsidian">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,111,239,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,111,239,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 h-[280px] w-[560px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(124,111,239,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-12 sm:py-16">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-sm text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-text-primary transition-colors hover:border-accent/40"
              aria-label="Go to SmartBuy AI home"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Zap size={18} fill="currentColor" />
              </span>
              <span className="font-display text-lg font-bold">
                SmartBuy <span className="text-accent">AI</span>
              </span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 sm:self-auto">
            <Heart size={16} className={wishlistCount > 0 ? 'fill-current' : ''} />
            {wishlistCount} saved {wishlistCount === 1 ? 'product' : 'products'}
          </div>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-surface/55 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-rose-300/80">
              Wishlist
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-text-primary sm:text-4xl">
              Saved Products You Want to Revisit
            </h1>
            <p className="mt-3 text-sm text-text-secondary sm:text-base">
              Keep an eye on interesting finds from your search results. Tap the heart again on any card to remove it from your wishlist.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="mt-10 rounded-[1.75rem] border border-dashed border-border bg-void/70 px-6 py-16 text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                <Heart size={28} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-semibold text-text-primary">
                Your wishlist is empty
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary">
                Search for products on the home page and tap the heart in the top-right corner of any result to save it here.
              </p>
              <div className="mt-8">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                >
                  <ArrowLeft size={16} />
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item, index) => (
                <ProductCard
                  key={item.id}
                  product={item.product}
                  rank={index + 1}
                  isBest={false}
                  style={{ animationDelay: `${index * 35}ms` }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

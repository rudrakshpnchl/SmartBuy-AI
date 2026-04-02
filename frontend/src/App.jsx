import { AlertTriangle } from 'lucide-react'
import { useSearch } from './hooks/useSearch'
import HeroHeader from './components/HeroHeader'
import SearchBar from './components/SearchBar'
import ProductCard from './components/ProductCard'
import ExplanationBox from './components/ExplanationBox'
import LoadingSkeleton from './components/LoadingSkeleton'

export default function App() {
  const { search, loading, result, error } = useSearch()
  const isMockSource = result && ['mock', 'fallback'].includes(result.data_source)
  const sourceLabel = isMockSource
    ? 'Curated Mock Catalog'
    : result?.data_source === 'google-shopping'
    ? 'Live Google Shopping'
    : result?.data_source

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Background grid */}
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

      {/* Radial glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(124,111,239,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <HeroHeader />

        {/* Search */}
        <div className="mb-10">
          <SearchBar onSearch={search} loading={loading} />
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30
            bg-red-500/5 text-red-400 mb-6 animate-fade-up">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-semibold text-sm">Search failed</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Results */}
        {!loading && result && (
          <div className="space-y-8">
            {/* Result header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display font-bold text-text-primary text-xl">
                  Results for{' '}
                  <span className="text-accent">"{result.query}"</span>
                </h2>
                <p className="text-text-muted text-sm mt-0.5">
                  {result.results.length} matching products · prices in {result.currency || 'INR'} · {result.took_ms}ms
                </p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full border font-mono ${
                isMockSource
                  ? 'border-amber-400/30 bg-amber-400/5 text-amber-400'
                  : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-400'
              }`}>
                {sourceLabel}
              </span>
            </div>

            {/* Best pick – hero card */}
            <section>
              <p className="text-xs text-text-muted font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="inline-block w-4 h-px bg-accent" />
                AI Best Pick
              </p>
              <div className="max-w-sm">
                <ProductCard
                  product={result.best}
                  rank={1}
                  isBest
                  style={{ animationDelay: '0ms' }}
                />
              </div>
            </section>

            {/* AI Explanation */}
            <ExplanationBox
              explanation={result.explanation}
              decisionSource={result.decision_source}
              dataSource={result.data_source}
              currency={result.currency}
              exchangeRate={result.exchange_rate_usd_to_inr}
              tookMs={result.took_ms}
            />

            {/* All alternatives */}
            <section>
              <p className="text-xs text-text-muted font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="inline-block w-4 h-px bg-border" />
                Ranked Alternatives
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.results
                  .filter((p) => (
                    p.title !== result.best.title ||
                    p.source !== result.best.source ||
                    p.url !== result.best.url
                  ))
                  .map((product, i) => (
                    <ProductCard
                      key={product.title + i}
                      product={product}
                      rank={i + 2}
                      isBest={false}
                      style={{ animationDelay: `${i * 80}ms` }}
                    />
                  ))}
              </div>
            </section>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">🛒</div>
            <p className="text-text-muted font-body text-sm">
              Search a product above to compare live shopping results with AI
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

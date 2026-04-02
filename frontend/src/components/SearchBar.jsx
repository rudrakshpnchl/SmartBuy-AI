import { useState, useRef, useEffect } from 'react'
import { Search, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'iPhone 13', 'Sony WH-1000XM5', 'MacBook Air M2',
  'Samsung Galaxy S22', 'Nike Air Max 270', 'LG OLED TV'
]

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim() && !loading) onSearch(query)
  }

  const handleSuggestion = (s) => {
    setQuery(s)
    onSearch(s)
    setFocused(false)
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className={`
          relative flex items-center rounded-2xl border transition-all duration-300
          ${focused
            ? 'border-accent bg-surface shadow-glow-accent'
            : 'border-border bg-void hover:border-text-muted'
          }
        `}>
          {/* Icon */}
          <div className="pl-5 pr-3 flex-shrink-0">
            {loading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search size={20} className={focused ? 'text-accent' : 'text-text-secondary'} />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search any product online…"
            disabled={loading}
            className="
              flex-1 py-4 bg-transparent text-text-primary placeholder-text-muted
              font-body text-base outline-none disabled:opacity-60
            "
          />

          {/* Keyboard hint */}
          {!focused && !query && (
            <kbd className="hidden sm:flex mr-4 items-center gap-1 px-2 py-1 rounded-md
              bg-surface border border-border text-text-muted text-xs font-mono">
              /
            </kbd>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="
              flex-shrink-0 mr-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm
              bg-accent text-white
              hover:bg-accent-glow active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {focused && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-2xl
          bg-surface border border-border shadow-card z-50 animate-fade-up">
          <p className="px-4 py-1.5 text-xs text-text-muted font-mono uppercase tracking-wider">
            Try searching for
          </p>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                text-text-secondary hover:text-text-primary hover:bg-void
                transition-colors text-sm font-body"
            >
              <Sparkles size={14} className="text-accent flex-shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

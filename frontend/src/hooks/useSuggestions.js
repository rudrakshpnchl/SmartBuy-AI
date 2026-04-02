import { useEffect, useState } from 'react'

const API_BASE = '/api'

export function useSuggestions(query, enabled) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!enabled || !trimmedQuery) {
      setSuggestions([])
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)

      try {
        const response = await fetch(
          `${API_BASE}/suggestions?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Suggestions request failed with ${response.status}`)
        }

        const data = await response.json()
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [enabled, query])

  return { suggestions, loading }
}

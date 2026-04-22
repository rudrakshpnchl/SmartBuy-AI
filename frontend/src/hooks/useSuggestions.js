import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiUrl } from '../lib/api'
import { getLocalSuggestions } from '../lib/localHistory'

export function useSuggestions(query, enabled) {
  const { currentUser } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [personalCount, setPersonalCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!enabled || !trimmedQuery) {
      setSuggestions([])
      setPersonalCount(0)
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      const localSuggestions = currentUser?.uid
        ? getLocalSuggestions(currentUser.uid, trimmedQuery, 6)
        : []

      try {
        const params = new URLSearchParams({ q: trimmedQuery, limit: '6' })
        const headers = {}

        if (currentUser?.uid) {
          const token = await currentUser.getIdToken()
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(
          `${apiUrl('/suggestions')}?${params.toString()}`,
          { headers, signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Suggestions request failed with ${response.status}`)
        }

        const data = await response.json()
        const merged = []
        const seen = new Set()

        for (const value of [...localSuggestions, ...(Array.isArray(data.suggestions) ? data.suggestions : [])]) {
          const normalized = value.trim().toLowerCase()
          if (!normalized || seen.has(normalized)) {
            continue
          }

          seen.add(normalized)
          merged.push(value.trim())

          if (merged.length >= 6) {
            break
          }
        }

        setSuggestions(merged)
        setPersonalCount(Math.min(merged.length, localSuggestions.length))
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions(localSuggestions)
          setPersonalCount(localSuggestions.length)
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
  }, [currentUser, enabled, query])

  return { suggestions, personalCount, loading }
}

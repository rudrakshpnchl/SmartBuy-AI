import { useState, useCallback } from 'react'

const API_BASE = '/api'

function normalizeErrorMessage(payload, status) {
  const visit = (value) => {
    if (!value) return []
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(visit)
    if (typeof value === 'object') {
      if (typeof value.msg === 'string') return [value.msg]
      if (typeof value.message === 'string') return [value.message]
      if (typeof value.detail === 'string') return [value.detail]
      return Object.values(value).flatMap(visit)
    }
    return [String(value)]
  }

  const message = visit(payload?.detail ?? payload?.message ?? payload)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  return message || `Error ${status}`
}

export function useSearch() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const search = useCallback(async (query) => {
    if (!query.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(normalizeErrorMessage(errData, res.status))
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  return { search, loading, result, error }
}

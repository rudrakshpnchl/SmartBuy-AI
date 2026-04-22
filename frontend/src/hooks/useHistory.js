import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiUrl } from '../lib/api'
import { mergeHistoryEntries, readLocalHistory } from '../lib/localHistory'

export function useHistory() {
  const { currentUser } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!currentUser) {
      setHistory([])
      setLoading(false)
      return
    }

    const localHistory = readLocalHistory(currentUser.uid)
    setHistory(localHistory)
    setLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const res = await fetch(apiUrl('/history'), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401 || res.status === 403) {
        setHistory(localHistory)
        return
      }

      if (!res.ok) {
        throw new Error(`History request failed with ${res.status}`)
      }

      const data = await res.json()
      setHistory(mergeHistoryEntries(Array.isArray(data.history) ? data.history : [], localHistory))
    } catch {
      setHistory(localHistory)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  return { history, loading, fetchHistory }
}

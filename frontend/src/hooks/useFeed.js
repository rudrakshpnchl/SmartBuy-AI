import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiUrl } from '../lib/api'
import { mergeFeedItems, readLocalFeed } from '../lib/localHistory'

export function useFeed() {
  const { currentUser } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFeed = useCallback(async () => {
    if (!currentUser) {
      setItems([])
      setLoading(false)
      return
    }

    const localItems = readLocalFeed(currentUser.uid)
    setItems(localItems)
    setLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const response = await fetch(apiUrl('/feed'), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401 || response.status === 403) {
        setItems(localItems)
        return
      }

      if (!response.ok) {
        throw new Error(`Feed request failed with ${response.status}`)
      }

      const data = await response.json()
      setItems(mergeFeedItems(Array.isArray(data.items) ? data.items : [], localItems))
    } catch {
      setItems(localItems)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  return { items, loading, fetchFeed }
}

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  hasWishlistItem,
  readWishlist,
  removeWishlist,
  toggleWishlist,
  WISHLIST_STORAGE_KEY,
  WISHLIST_UPDATED_EVENT,
} from '../lib/wishlist'

export function useWishlist() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid
  const [items, setItems] = useState([])

  const refreshWishlist = useCallback(() => {
    setItems(readWishlist(uid))
  }, [uid])

  useEffect(() => {
    refreshWishlist()
  }, [refreshWishlist])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key && event.key !== WISHLIST_STORAGE_KEY) {
        return
      }
      refreshWishlist()
    }

    function handleWishlistUpdated() {
      refreshWishlist()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(WISHLIST_UPDATED_EVENT, handleWishlistUpdated)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(WISHLIST_UPDATED_EVENT, handleWishlistUpdated)
    }
  }, [refreshWishlist])

  const handleToggleWishlist = useCallback((product) => {
    const nextItems = toggleWishlist(uid, product)
    setItems(nextItems)
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT))
    return nextItems
  }, [uid])

  const handleRemoveWishlist = useCallback((product) => {
    const nextItems = removeWishlist(uid, product)
    setItems(nextItems)
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT))
    return nextItems
  }, [uid])

  const isWishlisted = useCallback((product) => hasWishlistItem(items, product), [items])

  return {
    items,
    wishlistCount: items.length,
    isWishlisted,
    toggleWishlist: handleToggleWishlist,
    removeWishlist: handleRemoveWishlist,
    refreshWishlist,
  }
}

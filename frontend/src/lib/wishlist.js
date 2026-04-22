export const WISHLIST_STORAGE_KEY = 'smartbuy.wishlist.v1'
export const WISHLIST_UPDATED_EVENT = 'smartbuy:wishlist-updated'

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function readBucket() {
  const storage = getStorage()
  if (!storage) {
    return {}
  }

  try {
    const raw = storage.getItem(WISHLIST_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeBucket(value) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Ignore localStorage failures and keep the app usable.
  }
}

function getScopeKey(uid) {
  return uid || 'guest'
}

export function getWishlistItemKey(product) {
  return [
    String(product?.url || '').trim().toLowerCase(),
    String(product?.title || '').trim().toLowerCase(),
    String(product?.source || '').trim().toLowerCase(),
  ].join('::')
}

function serializeProduct(product) {
  return {
    title: product?.title || 'Untitled product',
    price: Number(product?.price || 0),
    currency: product?.currency || 'INR',
    rating: Number(product?.rating || 0),
    source: product?.source || 'Unknown',
    url: product?.url || '',
    delivery: product?.delivery || 'Shipping details unavailable',
    reviews_count: Number(product?.reviews_count || 0),
    in_stock: Boolean(product?.in_stock),
    relevance_score: typeof product?.relevance_score === 'number' ? product.relevance_score : undefined,
    thumbnail: product?.thumbnail || '',
    snippet: product?.snippet || '',
  }
}

function normalizeWishlistItems(items) {
  const byKey = new Map()

  for (const item of items || []) {
    const product = serializeProduct(item?.product || item)
    const id = item?.id || getWishlistItemKey(product)
    if (!id) {
      continue
    }

    const savedAt = Number(item?.saved_at || Date.now())
    const nextItem = {
      id,
      product,
      saved_at: savedAt,
    }

    const previous = byKey.get(id)
    if (!previous || nextItem.saved_at >= previous.saved_at) {
      byKey.set(id, nextItem)
    }
  }

  return Array.from(byKey.values()).sort((left, right) => right.saved_at - left.saved_at)
}

export function readWishlist(uid) {
  const bucket = readBucket()
  return normalizeWishlistItems(bucket[getScopeKey(uid)] || [])
}

export function toggleWishlist(uid, product) {
  const bucket = readBucket()
  const scopeKey = getScopeKey(uid)
  const currentItems = normalizeWishlistItems(bucket[scopeKey] || [])
  const itemId = getWishlistItemKey(product)
  if (!itemId) {
    return currentItems
  }

  const exists = currentItems.some((item) => item.id === itemId)
  const nextItems = exists
    ? currentItems.filter((item) => item.id !== itemId)
    : normalizeWishlistItems([
        {
          id: itemId,
          product: serializeProduct(product),
          saved_at: Date.now(),
        },
        ...currentItems,
      ])

  bucket[scopeKey] = nextItems
  writeBucket(bucket)
  return nextItems
}

export function removeWishlist(uid, product) {
  const bucket = readBucket()
  const scopeKey = getScopeKey(uid)
  const itemId = getWishlistItemKey(product)
  const nextItems = normalizeWishlistItems(bucket[scopeKey] || []).filter((item) => item.id !== itemId)
  bucket[scopeKey] = nextItems
  writeBucket(bucket)
  return nextItems
}

export function hasWishlistItem(items, product) {
  const itemId = getWishlistItemKey(product)
  return items.some((item) => item.id === itemId)
}

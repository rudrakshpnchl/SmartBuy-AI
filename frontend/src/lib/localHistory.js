const HISTORY_STORAGE_KEY = 'smartbuy.history.v1'
const FEED_STORAGE_KEY = 'smartbuy.feed.v1'

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function readBucket(key) {
  const storage = getStorage()
  if (!storage) {
    return {}
  }

  try {
    const raw = storage.getItem(key)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeBucket(key, value) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures and fall back to in-memory app state.
  }
}

function getScopeKey(uid) {
  return uid || 'guest'
}

export function normalizeHistoryQuery(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function toIsoTimestamp(value) {
  if (!value) {
    return new Date().toISOString()
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }

  return date.toISOString()
}

function toEpochSeconds(value) {
  const num = Number(value)
  if (Number.isFinite(num) && num > 0) {
    return Math.floor(num)
  }

  return Math.floor(Date.now() / 1000)
}

function dedupeHistoryItems(items) {
  const byQuery = new Map()

  items.forEach((item) => {
    const normalizedQuery = normalizeHistoryQuery(item?.normalized_query || item?.query)
    if (!normalizedQuery) {
      return
    }

    const nextItem = {
      query: String(item?.query || normalizedQuery).trim(),
      normalized_query: normalizedQuery,
      count: Math.max(1, Number(item?.count) || 1),
      timestamp: toIsoTimestamp(item?.timestamp),
    }

    const previous = byQuery.get(normalizedQuery)
    if (!previous) {
      byQuery.set(normalizedQuery, nextItem)
      return
    }

    const previousTs = Date.parse(previous.timestamp) || 0
    const nextTs = Date.parse(nextItem.timestamp) || 0

    byQuery.set(normalizedQuery, {
      query: nextTs >= previousTs ? nextItem.query : previous.query,
      normalized_query: normalizedQuery,
      count: Math.max(previous.count, nextItem.count),
      timestamp: nextTs >= previousTs ? nextItem.timestamp : previous.timestamp,
    })
  })

  return Array.from(byQuery.values())
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 20)
}

function dedupeFeedItems(items) {
  const byQuery = new Map()

  items.forEach((item) => {
    const normalizedQuery = normalizeHistoryQuery(item?.normalized_query || item?.query)
    if (!normalizedQuery || !item?.product?.title) {
      return
    }

    const nextItem = {
      query: String(item.query || normalizedQuery).trim(),
      normalized_query: normalizedQuery,
      product: item.product,
      data_source: String(item.data_source || 'local'),
      cached_at: toEpochSeconds(item.cached_at),
    }

    const previous = byQuery.get(normalizedQuery)
    if (!previous || nextItem.cached_at >= previous.cached_at) {
      byQuery.set(normalizedQuery, nextItem)
    }
  })

  return Array.from(byQuery.values())
    .sort((left, right) => right.cached_at - left.cached_at)
    .slice(0, 8)
}

export function readLocalHistory(uid) {
  const bucket = readBucket(HISTORY_STORAGE_KEY)
  return dedupeHistoryItems(bucket[getScopeKey(uid)] || []).map(({ normalized_query, ...item }) => item)
}

export function saveLocalHistoryEntry(uid, query) {
  const normalizedQuery = normalizeHistoryQuery(query)
  if (!normalizedQuery) {
    return []
  }

  const bucket = readBucket(HISTORY_STORAGE_KEY)
  const scopeKey = getScopeKey(uid)
  const nextItems = dedupeHistoryItems([
    ...(bucket[scopeKey] || []),
    {
      query: String(query).trim(),
      normalized_query: normalizedQuery,
      count: ((bucket[scopeKey] || []).find((item) => normalizeHistoryQuery(item?.query) === normalizedQuery)?.count || 0) + 1,
      timestamp: new Date().toISOString(),
    },
  ])

  bucket[scopeKey] = nextItems
  writeBucket(HISTORY_STORAGE_KEY, bucket)

  return nextItems.map(({ normalized_query, ...item }) => item)
}

export function mergeHistoryEntries(primary, secondary) {
  return dedupeHistoryItems([...(primary || []), ...(secondary || [])]).map(({ normalized_query, ...item }) => item)
}

export function readLocalFeed(uid) {
  const bucket = readBucket(FEED_STORAGE_KEY)
  return dedupeFeedItems(bucket[getScopeKey(uid)] || []).map(({ normalized_query, ...item }) => item)
}

export function saveLocalFeedEntry(uid, item) {
  const normalizedQuery = normalizeHistoryQuery(item?.query)
  if (!normalizedQuery || !item?.product?.title) {
    return []
  }

  const bucket = readBucket(FEED_STORAGE_KEY)
  const scopeKey = getScopeKey(uid)
  const nextItems = dedupeFeedItems([
    ...(bucket[scopeKey] || []),
    {
      ...item,
      normalized_query: normalizedQuery,
      cached_at: toEpochSeconds(item.cached_at),
    },
  ])

  bucket[scopeKey] = nextItems
  writeBucket(FEED_STORAGE_KEY, bucket)

  return nextItems.map(({ normalized_query, ...feedItem }) => feedItem)
}

export function mergeFeedItems(primary, secondary) {
  return dedupeFeedItems([...(primary || []), ...(secondary || [])]).map(({ normalized_query, ...item }) => item)
}

export function getLocalSuggestions(uid, query, limit = 6) {
  const normalizedQuery = normalizeHistoryQuery(query)
  if (!normalizedQuery) {
    return []
  }

  return readLocalHistory(uid)
    .map((item) => item.query)
    .filter((value) => normalizeHistoryQuery(value).startsWith(normalizedQuery))
    .slice(0, limit)
}

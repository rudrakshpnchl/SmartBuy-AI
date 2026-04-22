const rawApiBase = (import.meta.env.VITE_API_URL || '/api').trim()

export const API_BASE = rawApiBase.endsWith('/')
  ? rawApiBase.slice(0, -1)
  : rawApiBase

export function apiUrl(path = '') {
  if (!path) return API_BASE
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalizedPath}`
}

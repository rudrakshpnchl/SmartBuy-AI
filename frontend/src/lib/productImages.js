export function buildProductPlaceholder(title) {
  const safeTitle = String(title || 'Product')
    .slice(0, 48)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#111827" />
          <stop offset="1" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="32" fill="url(#g)" />
      <circle cx="320" cy="230" r="96" fill="#374151" />
      <rect x="170" y="360" width="300" height="30" rx="15" fill="#6b7280" />
      <rect x="140" y="415" width="360" height="22" rx="11" fill="#4b5563" />
      <text x="320" y="520" text-anchor="middle" font-family="Arial" font-size="28" fill="#e5e7eb">
        ${safeTitle}
      </text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function normalizeProductImageSrc(src, title) {
  const value = String(src || '').trim()
  if (value.startsWith('data:image/')) {
    return value
  }
  if (/^https?:\/\//i.test(value)) {
    return value
  }
  return buildProductPlaceholder(title)
}

export const formatPrice = (price: number): string =>
  `৳${price.toLocaleString('en-US')}`

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

// "13 Oct 2026, 14:05" for timelines, where the time of day matters
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    // The API requires words joined by single hyphens, with none at either end
    .replace(/^-+|-+$/g, '')

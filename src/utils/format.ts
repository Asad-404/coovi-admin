export const formatPrice = (price: number): string =>
  `৳${price.toLocaleString('en-US')}`

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')

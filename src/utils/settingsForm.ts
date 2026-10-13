// Checks for the Settings page, matching what the API accepts, so the admin sees
// the problem next to the field before saving. The API still checks again.

// Accepts 01XXXXXXXXX, 8801XXXXXXXXX or +880 1XXX-XXXXXX and returns 8801XXXXXXXXX, or null if invalid
export const normalizeWhatsapp = (input: string): string | null => {
  const digits = input.replace(/\D/g, '')
  const full = digits.startsWith('01') ? `88${digits}` : digits
  return /^8801[3-9]\d{8}$/.test(full) ? full : null
}

// Accepts 01XXXXXXXXX (spaces, dashes or a +88 prefix allowed) and returns 01XXXXXXXXX,
// '' for an empty box, or null if invalid
export const normalizeSupportPhone = (input: string): string | null => {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''
  const local = digits.startsWith('880') ? digits.slice(2) : digits
  return /^01[3-9]\d{8}$/.test(local) ? local : null
}

export const ANNOUNCEMENT_MAX = 120

export const announcementError = (text: string, active: boolean): string => {
  const trimmed = text.trim()
  if (trimmed.length > ANNOUNCEMENT_MAX) return `Keep it to ${ANNOUNCEMENT_MAX} characters`
  if (active && !trimmed) return 'Add the text before turning the announcement on'
  return ''
}

export const parseLowStockThreshold = (input: string): number | null => {
  if (!/^\d+$/.test(input.trim())) return null
  const n = Number(input)
  return n <= 1000 ? n : null
}

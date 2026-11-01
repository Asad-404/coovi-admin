import { normalizeWhatsapp } from '@/utils/settingsForm'

export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`

// null when the number can't be a WhatsApp number, so no dead button is shown
export const whatsappHref = (phone: string): string | null => {
  const number = normalizeWhatsapp(phone)
  return number ? `https://wa.me/${number}` : null
}

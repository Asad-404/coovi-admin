import { IconButton, Tooltip } from '@mui/material'
import CallIcon from '@mui/icons-material/Call'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { telHref, whatsappHref } from '@/utils/phone'

// Calling is how every order gets confirmed, so it is one tap wherever a customer shows
export default function ContactButtons({ phone, name }: { phone: string; name: string }) {
  const whatsapp = whatsappHref(phone)
  return (
    <>
      <Tooltip title={`Call ${phone}`}>
        <IconButton component="a" href={telHref(phone)} aria-label={`Call ${name}`} color="primary" sx={{ border: 1, borderColor: 'divider' }}>
          <CallIcon />
        </IconButton>
      </Tooltip>
      {whatsapp && (
        <Tooltip title="Message on WhatsApp">
          <IconButton
            component="a"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Message ${name} on WhatsApp`}
            sx={{ border: 1, borderColor: 'divider', color: '#128c4b' }}
          >
            <WhatsAppIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}

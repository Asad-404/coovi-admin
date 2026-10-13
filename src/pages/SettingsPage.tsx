import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { getErrorMessage } from '@/api/errors'
import { settingsApi } from '@/api/settings'
import type { SettingsUpdate } from '@/api/settings'
import { useNotify } from '@/notify/context'
import type { ShopSettings } from '@/types'
import {
  ANNOUNCEMENT_MAX,
  announcementError,
  normalizeSupportPhone,
  normalizeWhatsapp,
  parseLowStockThreshold,
} from '@/utils/settingsForm'

// Saves one section's fields, refreshes every screen that uses settings, and reports the result
function useSaveSettings(successMessage: string) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (changes: SettingsUpdate) => settingsApi.update(changes),
    onSuccess: (saved) => {
      setError('')
      queryClient.setQueryData(['settings'], saved)
      notify(successMessage)
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the settings')),
  })

  return { save: mutation.mutate, saving: mutation.isPending, error, setError }
}

function Section({
  title,
  description,
  error,
  saving,
  onSubmit,
  children,
}: {
  title: string
  description: string
  error: string
  saving: boolean
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  return (
    <Card component="form" onSubmit={onSubmit} noValidate>
      <CardContent>
        <Stack spacing={2}>
          <div>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </div>
          {error && <Alert severity="error">{error}</Alert>}
          {children}
          <div>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              Save
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  )
}

function ContactSection({ settings }: { settings: ShopSettings }) {
  const [whatsapp, setWhatsapp] = useState(settings.whatsappNumber)
  const [supportPhone, setSupportPhone] = useState(settings.supportPhone)
  const [fieldErrors, setFieldErrors] = useState({ whatsapp: '', supportPhone: '' })
  const { save, saving, error } = useSaveSettings('Contact details saved')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const whatsappNumber = normalizeWhatsapp(whatsapp)
    const phone = normalizeSupportPhone(supportPhone)
    setFieldErrors({
      whatsapp: whatsappNumber ? '' : 'Enter a Bangladeshi mobile number, like 01712345678',
      supportPhone: phone === null ? 'Enter a Bangladeshi mobile number, or leave it empty' : '',
    })
    if (!whatsappNumber || phone === null) return
    setWhatsapp(whatsappNumber)
    setSupportPhone(phone)
    save({ whatsappNumber, supportPhone: phone })
  }

  return (
    <Section
      title="Contact"
      description="Shown to customers on the shop: the WhatsApp chat buttons and the support phone."
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
    >
      <TextField
        label="WhatsApp number"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        error={Boolean(fieldErrors.whatsapp)}
        helperText={fieldErrors.whatsapp || 'Saved as 8801XXXXXXXXX. Customers chat with this number.'}
        inputMode="tel"
        required
      />
      <TextField
        label="Support phone (optional)"
        value={supportPhone}
        onChange={(e) => setSupportPhone(e.target.value)}
        error={Boolean(fieldErrors.supportPhone)}
        helperText={fieldErrors.supportPhone || 'Like 01712345678. Leave empty to hide it.'}
        inputMode="tel"
      />
    </Section>
  )
}

function AnnouncementSection({ settings }: { settings: ShopSettings }) {
  const [text, setText] = useState(settings.announcementText)
  const [active, setActive] = useState(settings.announcementActive)
  const [fieldError, setFieldError] = useState('')
  const { save, saving, error } = useSaveSettings('Announcement saved')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const problem = announcementError(text, active)
    setFieldError(problem)
    if (problem) return
    save({ announcementText: text.trim(), announcementActive: active })
  }

  return (
    <Section
      title="Announcement"
      description="The blue strip under the shop header. It links to the shop page. The shop updates within a few minutes."
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
    >
      <FormControlLabel
        control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
        label={active ? 'Showing on the shop' : 'Hidden'}
      />
      <TextField
        label="Announcement text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={Boolean(fieldError)}
        helperText={fieldError || `${text.trim().length}/${ANNOUNCEMENT_MAX} characters`}
      />
    </Section>
  )
}

function StockSection({ settings }: { settings: ShopSettings }) {
  const [threshold, setThreshold] = useState(String(settings.lowStockThreshold))
  const [fieldError, setFieldError] = useState('')
  const { save, saving, error } = useSaveSettings('Stock alert saved')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = parseLowStockThreshold(threshold)
    setFieldError(value === null ? 'Enter a whole number from 0 to 1000' : '')
    if (value === null) return
    save({ lowStockThreshold: value })
  }

  return (
    <Section
      title="Stock alerts"
      description="Products with fewer pieces than this are marked low stock on the dashboard and products list. Only you see this."
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
    >
      <TextField
        label="Low stock below"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        error={Boolean(fieldError)}
        helperText={fieldError || 'Set 0 to turn the low stock warning off.'}
        inputMode="numeric"
        sx={{ maxWidth: 240 }}
      />
    </Section>
  )
}

export default function SettingsPage() {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h4">Settings</Typography>

      {isError && <Alert severity="error">Could not load the settings. The API may be down.</Alert>}

      {isLoading && <Skeleton variant="rounded" height={240} />}

      {settings && (
        <>
          <ContactSection settings={settings} />
          <AnnouncementSection settings={settings} />
          <StockSection settings={settings} />
        </>
      )}
    </Stack>
  )
}

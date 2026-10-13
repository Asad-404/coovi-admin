import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { ordersApi } from '@/api/orders'
import { getErrorMessage } from '@/api/errors'
import type { Order } from '@/types'
import { actorLabel, buildTimeline } from '@/utils/orderTimeline'
import type { TimelineEntry } from '@/utils/orderTimeline'
import { formatDateTime } from '@/utils/format'

const NOTE_MAX = 500

const ICONS: Record<TimelineEntry['kind'], typeof StickyNote2Icon> = {
  note: StickyNote2Icon,
  status: SwapHorizIcon,
  edit: EditNoteIcon,
}

// Private notes plus a record of who changed what. Customers never see any of it.
export default function OrderTimeline({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (note: string) => ordersApi.addNote(order._id, note),
    onSuccess: (updated) => {
      // Show the note at once, then refetch so the list stays in step with the API
      queryClient.setQueryData<Order[]>(['orders'], (orders) =>
        orders?.map((o) => (o._id === updated._id ? updated : o)),
      )
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setText('')
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not add the note')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!text.trim()) return setError('Write something first')
    mutation.mutate(text.trim())
  }

  const timeline = buildTimeline(order)

  return (
    <div>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Notes and history (only admins see this)
      </Typography>

      <Stack spacing={1} component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          placeholder="Add a private note, e.g. called, will pay on Friday"
          aria-label="Private note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={2}
          size="small"
          helperText={`${text.length}/${NOTE_MAX}. Notes can't be edited or deleted later.`}
          slotProps={{ htmlInput: { maxLength: NOTE_MAX } }}
        />
        <Box>
          <Button
            type="submit"
            variant="outlined"
            size="small"
            disabled={mutation.isPending}
            startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Add note
          </Button>
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        {timeline.map((entry) => {
          const Icon = ICONS[entry.kind]
          return (
            <Stack key={`${entry.kind}-${entry.id}`} direction="row" spacing={1.5}>
              <Icon fontSize="small" color={entry.kind === 'note' ? 'primary' : 'action'} sx={{ mt: 0.25 }} />
              <div>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontWeight: entry.kind === 'note' ? 400 : 500 }}>
                  {entry.text}
                </Typography>
                {entry.kind === 'edit' &&
                  entry.details.map((line) => (
                    <Typography key={line} variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {line}
                    </Typography>
                  ))}
                <Typography variant="caption" color="text.secondary">
                  {actorLabel(entry.by)} · {formatDateTime(entry.at)}
                </Typography>
              </div>
            </Stack>
          )
        })}
      </Stack>
    </div>
  )
}

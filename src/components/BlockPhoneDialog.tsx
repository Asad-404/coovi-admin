import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { customersApi } from '@/api/customers'
import { getErrorMessage } from '@/api/errors'
import { ORDERS_KEY } from '@/hooks/useOrders'
import { useNotify } from '@/notify/context'

interface BlockPhoneDialogProps {
  phone: string
  name?: string
  // Currently blocked: the dialog unblocks instead
  blocked: boolean
  open: boolean
  onClose: () => void
}

// Blocking does not refuse the customer's orders (owner decision): they still come in,
// shown in red, so someone calls to confirm before shipping
export default function BlockPhoneDialog({ phone, name, blocked, open, onClose }: BlockPhoneDialogProps) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => customersApi.setBlocked(phone, !blocked, note.trim() || undefined),
    onSuccess: () => {
      notify(blocked ? `${phone} unblocked` : `${phone} blocked`)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
      setNote('')
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the change')),
  })

  const who = name ? `${name} (${phone})` : phone

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{blocked ? 'Unblock this number?' : 'Block this number?'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {blocked ? (
            <Typography>Orders from {who} will no longer be marked in red.</Typography>
          ) : (
            <>
              <Typography>
                New orders from {who} will still come in, marked in red, so you can call before shipping.
                The customer is not told.
              </Typography>
              <TextField
                label="Reason (optional)"
                placeholder="e.g. Refused two parcels"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 300 } }}
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Back</Button>
        <Button
          variant="contained"
          color={blocked ? 'primary' : 'error'}
          disabled={mutation.isPending}
          onClick={() => {
            setError('')
            mutation.mutate()
          }}
        >
          {blocked ? 'Unblock' : 'Block number'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, CircularProgress, Stack, TextField } from '@mui/material'
import { ordersApi } from '@/api/orders'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import type { Order, OrderDetailsUpdate } from '@/types'

interface OrderDetailsFormProps {
  order: Order
  onDone: () => void
}

// Edits contact/delivery details. Same rules as checkout; the API re-checks them.
export default function OrderDetailsForm({ order, onDone }: OrderDetailsFormProps) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [customerName, setCustomerName] = useState(order.customerName)
  const [phone, setPhone] = useState(order.phone)
  const [address, setAddress] = useState(order.address)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (changes: OrderDetailsUpdate) => ordersApi.updateDetails(order._id, changes),
    onSuccess: () => {
      notify(`${order.orderNumber} updated`)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onDone()
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not update the order')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) return setError('Name is required')
    if (!/^01\d{9}$/.test(phone)) return setError('Phone must be 11 digits starting with 01')
    if (address.trim().length < 5) return setError('Address must be at least 5 characters')

    // Send only what changed
    const changes: OrderDetailsUpdate = {}
    if (customerName.trim() !== order.customerName) changes.customerName = customerName.trim()
    if (phone !== order.phone) changes.phone = phone
    if (address.trim() !== order.address) changes.address = address.trim()
    if (notes.trim() !== (order.notes ?? '')) changes.notes = notes.trim()

    if (Object.keys(changes).length === 0) return onDone()
    mutation.mutate(changes)
  }

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          required
          fullWidth
          size="small"
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </Stack>
      <TextField
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
        multiline
        minRows={2}
        size="small"
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
      <TextField
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        minRows={2}
        size="small"
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
      <Stack direction="row" spacing={1}>
        <Button
          type="submit"
          variant="contained"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save details
        </Button>
        <Button onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  )
}

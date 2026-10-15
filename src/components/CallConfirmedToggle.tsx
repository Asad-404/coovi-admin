import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Checkbox, CircularProgress, FormControlLabel, Stack, Typography } from '@mui/material'
import { ordersApi } from '@/api/orders'
import { getErrorMessage } from '@/api/errors'
import { ORDERS_KEY } from '@/hooks/useOrders'
import type { Order } from '@/types'
import { formatDateTime } from '@/utils/format'

interface CallConfirmedToggleProps {
  order: Order
  // false shows the state without the tick box (view-only access or a final order)
  editable: boolean
}

// "Confirmed by call": the website can't check that a phone belongs to the person
// ordering, so someone ticks this after calling the customer.
export default function CallConfirmedToggle({ order, editable }: CallConfirmedToggleProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (confirmed: boolean) => ordersApi.setCallConfirmed(order._id, confirmed),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Could not save the call confirmation'))
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
  })

  const confirmed = Boolean(order.callConfirmed)
  const who = order.callConfirmed && `by ${order.callConfirmed.by}, ${formatDateTime(order.callConfirmed.at)}`

  return (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      {editable ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                disabled={mutation.isPending}
                onChange={(e) => mutation.mutate(e.target.checked)}
              />
            }
            label="Confirmed by call"
          />
          {mutation.isPending && <CircularProgress size={16} />}
        </Stack>
      ) : (
        <Typography variant="body2">{confirmed ? 'Confirmed by call' : 'Not confirmed by call'}</Typography>
      )}
      {(confirmed || editable) && (
        <Typography variant="body2" color="text.secondary">
          {confirmed ? who : 'Call the customer before moving this order to Processing.'}
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  )
}

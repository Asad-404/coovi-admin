import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ordersApi } from '@/api/orders'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import type { DeliveryArea, Order, OrderDetailsUpdate } from '@/types'
import { orderArea } from '@/utils/deliveryArea'
import { formatPrice } from '@/utils/format'

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
  const [district, setDistrict] = useState(order.district ?? '')
  const [area, setArea] = useState<DeliveryArea>(orderArea(order))
  const [error, setError] = useState('')

  // The API only lets the district and area change before the order is confirmed
  const canChangeDelivery = order.status === 'Pending'
  const { data: deliveryOptions } = useQuery({
    queryKey: ['delivery-options'],
    queryFn: ordersApi.getDeliveryOptions,
    enabled: canChangeDelivery,
    staleTime: 60_000,
  })
  const areaChanged = area !== orderArea(order)
  const newFee = deliveryOptions?.zones[area]

  const changeDistrict = (value: string) => {
    setDistrict(value)
    // Only Dhaka district can be inside Dhaka; picking Dhaka starts at the city
    setArea(value === 'Dhaka' ? 'inside_dhaka' : 'outside_dhaka')
  }

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
    if (district && district !== (order.district ?? '')) changes.district = district
    if (areaChanged) changes.deliveryArea = area

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
      {canChangeDelivery && (
        <Stack spacing={1}>
          <TextField
            select
            label="District"
            value={district}
            onChange={(e) => changeDistrict(e.target.value)}
            size="small"
            disabled={!deliveryOptions}
            helperText={order.district ? undefined : 'This order was placed before districts existed'}
          >
            {(deliveryOptions?.districts ?? []).map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          {district === 'Dhaka' && (
            <RadioGroup row value={area} onChange={(e) => setArea(e.target.value as DeliveryArea)}>
              <FormControlLabel value="inside_dhaka" control={<Radio size="small" />} label="Dhaka city" />
              <FormControlLabel value="outside_dhaka" control={<Radio size="small" />} label="Dhaka suburbs" />
            </RadioGroup>
          )}
          {areaChanged && newFee !== undefined && (
            <Typography variant="body2" color="warning.main">
              The delivery fee will change from {formatPrice(order.deliveryFee)} to {formatPrice(newFee)}, so the
              total becomes {formatPrice(order.subtotal - (order.discount ?? 0) + newFee)}.
            </Typography>
          )}
        </Stack>
      )}
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

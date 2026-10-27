import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, CircularProgress, IconButton, Link, Stack, Table, TableBody, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { ordersApi } from '@/api/orders'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import type { Order } from '@/types'
import { canBookCourier, courierStatusLabel, steadfastTrackingUrl } from '@/utils/courier'
import { formatDate, formatPrice } from '@/utils/format'

interface CourierSectionProps {
  order: Order
  // Booking and checking need orders.edit; everyone who sees the order sees the tracking code
  canEdit: boolean
}

// Books the parcel with Steadfast and shows its tracking code and courier status.
// Booking is a real request to Steadfast, so it asks once more before sending.
export default function CourierSection({ order, canEdit }: CourierSectionProps) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const onSuccess = (message: string) => () => {
    setError('')
    setConfirming(false)
    notify(message)
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const book = useMutation({
    mutationFn: () => ordersApi.bookSteadfast(order._id),
    onSuccess: onSuccess(`${order.orderNumber} booked with Steadfast`),
    onError: (err) => {
      setConfirming(false)
      setError(getErrorMessage(err, 'Could not book with Steadfast'))
      // A 409 usually means it was booked or changed elsewhere — show the current state
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const refresh = useMutation({
    mutationFn: () => ordersApi.refreshSteadfast(order._id),
    onSuccess: onSuccess('Steadfast status updated'),
    onError: (err) => setError(getErrorMessage(err, 'Could not check Steadfast')),
  })

  const courier = order.courier
  const trackingCode = courier?.trackingCode

  if (!trackingCode && !(canEdit && canBookCourier(order))) return null

  return (
    <div>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Courier
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {trackingCode ? (
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 'medium', width: '30%' }}>Steadfast tracking</TableCell>
              <TableCell>
                <Link href={steadfastTrackingUrl(trackingCode)} target="_blank" rel="noopener noreferrer">
                  {trackingCode}
                </Link>
                <Tooltip title="Copy tracking code">
                  <IconButton
                    size="small"
                    aria-label="Copy tracking code"
                    sx={{ ml: 0.5 }}
                    onClick={() => navigator.clipboard?.writeText(trackingCode).then(() => notify('Tracking code copied'))}
                  >
                    <ContentCopyIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'medium' }}>Courier status</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <span>
                    {courierStatusLabel(courier?.status)}
                    {courier?.statusCheckedAt && (
                      <Typography component="span" variant="caption" color="text.secondary">
                        {' '}(checked {formatDate(courier.statusCheckedAt)})
                      </Typography>
                    )}
                  </span>
                  {canEdit && (
                  <Tooltip title="Check with Steadfast">
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Check status with Steadfast"
                        disabled={refresh.isPending}
                        onClick={() => refresh.mutate()}
                      >
                        {refresh.isPending ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
            {courier?.bookedAt && (
              <TableRow>
                <TableCell sx={{ fontWeight: 'medium' }}>Booked</TableCell>
                <TableCell>{formatDate(courier.bookedAt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : confirming ? (
        <Alert
          severity="info"
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setConfirming(false)} disabled={book.isPending}>
                Back
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={book.isPending}
                startIcon={book.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
                onClick={() => book.mutate()}
              >
                Book now
              </Button>
            </Stack>
          }
        >
          Send this parcel to Steadfast for {order.customerName}, collecting {formatPrice(order.total)} cash on delivery?
        </Alert>
      ) : (
        <Button variant="outlined" startIcon={<LocalShippingIcon />} onClick={() => setConfirming(true)}>
          Book with Steadfast
        </Button>
      )}
    </div>
  )
}

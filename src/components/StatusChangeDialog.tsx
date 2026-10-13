import { useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { Order, RefundMethod, StatusChange } from '@/types'
import {
  CANCEL_REASONS,
  daysSinceDelivery,
  isPastReturnWindow,
  REFUND_METHODS,
  RETURN_WINDOW_DAYS,
} from '@/utils/orderStatus'
import { hasPreorder } from '@/utils/preorder'

const OTHER = 'Other'

interface StatusChangeDialogProps {
  // The order being cancelled or returned; null keeps the dialog closed
  order: Order | null
  status: 'Cancelled' | 'Returned'
  saving: boolean
  onClose: () => void
  onConfirm: (change: StatusChange) => void
}

// Asks why an order is cancelled or returned, whether a returned saree can be
// sold again, and (after delivery) how much was refunded and how. Mounted with
// a key per order, so every open starts from a clean form.
export default function StatusChangeDialog({ order, status, saving, onClose, onConfirm }: StatusChangeDialogProps) {
  const returning = status === 'Returned'
  const afterDelivery = returning && order?.status === 'Delivered'

  const [reason, setReason] = useState<string>(returning ? (afterDelivery ? 'Damaged' : CANCEL_REASONS[0]) : '')
  const [otherText, setOtherText] = useState('')
  const [restock, setRestock] = useState(true)
  const [refundAmount, setRefundAmount] = useState(afterDelivery && order ? String(order.subtotal) : '')
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('bKash')

  if (!order) return null

  const finalReason = reason === OTHER ? otherText.trim() : reason
  const refund = Number(refundAmount)
  const refundInvalid =
    afterDelivery && refundAmount !== '' && (!Number.isInteger(refund) || refund < 0 || refund > order.total)
  // A return must say why; a cancel may leave the reason empty
  const missingReason = (returning || reason === OTHER) && !finalReason
  const days = daysSinceDelivery(order)

  const confirm = () => {
    const change: StatusChange = { status }
    if (finalReason) change.reason = finalReason
    if (returning) change.restock = restock
    if (afterDelivery && refundAmount !== '' && refund > 0) {
      change.refundAmount = refund
      change.refundMethod = refundMethod
    }
    onConfirm(change)
  }

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>
        {returning ? 'Mark' : 'Cancel'} order {order.orderNumber}
        {returning ? ' as returned' : ''}?
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography>
            {returning
              ? afterDelivery
                ? `${order.customerName} is sending back a delivered order.`
                : `${order.customerName}'s parcel came back without being delivered.`
              : `${order.customerName}'s order will be cancelled.`}{' '}
            This can't be undone.
            {!returning && order.status === 'Processing' && ' Its items will be returned to stock.'}
          </Typography>

          {afterDelivery && isPastReturnWindow(order) && (
            <Alert severity="warning">
              Delivered {days} days ago, past the {RETURN_WINDOW_DAYS}-day return window. You can still accept it.
            </Alert>
          )}

          <TextField
            select
            label={returning ? 'Reason' : 'Reason (optional)'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            size="small"
          >
            {!returning && <MenuItem value="">No reason</MenuItem>}
            {CANCEL_REASONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
            <MenuItem value={OTHER}>Other…</MenuItem>
          </TextField>

          {reason === OTHER && (
            <TextField
              label="What happened?"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              size="small"
              slotProps={{ htmlInput: { maxLength: 300 } }}
              autoFocus
            />
          )}

          {returning && (
            <FormControlLabel
              control={<Checkbox checked={restock} onChange={(e) => setRestock(e.target.checked)} />}
              label="Put the items back in stock (untick if damaged)"
            />
          )}
          {returning && hasPreorder(order) && (
            <Typography variant="body2" color="text.secondary">
              Pre-order items were never taken from stock, so they are not added back. Add them on the product page if
              you want to sell them.
            </Typography>
          )}

          {afterDelivery && (
            <Stack direction="row" spacing={2}>
              <TextField
                label="Refund (৳)"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                size="small"
                error={refundInvalid}
                helperText={refundInvalid ? `0 to ${order.total}` : 'Leave 0 if nothing was paid back'}
                slotProps={{ htmlInput: { min: 0, max: order.total, step: 1 } }}
                sx={{ flex: 1 }}
              />
              <TextField
                select
                label="Paid by"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                size="small"
                sx={{ flex: 1 }}
              >
                {REFUND_METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Keep order
        </Button>
        <Button
          color={returning ? 'secondary' : 'error'}
          variant="contained"
          disabled={saving || missingReason || refundInvalid}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={confirm}
        >
          {returning ? 'Mark returned' : 'Cancel order'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

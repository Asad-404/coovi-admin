import { useState } from 'react'
import {
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
import type { Order, StatusChange } from '@/types'
import { CANCEL_REASONS } from '@/utils/orderStatus'
import { hasPreorder } from '@/utils/preorder'

const OTHER = 'Other'

interface StatusChangeDialogProps {
  // The order being cancelled or marked returned; null keeps the dialog closed
  order: Order | null
  status: 'Cancelled' | 'Returned'
  saving: boolean
  onClose: () => void
  onConfirm: (change: StatusChange) => void
}

// Asks why an order is cancelled or its parcel came back, and whether a
// refused saree can be sold again. Mounted with a key per order, so every
// open starts from a clean form.
export default function StatusChangeDialog({ order, status, saving, onClose, onConfirm }: StatusChangeDialogProps) {
  const returning = status === 'Returned'

  const [reason, setReason] = useState<string>(returning ? CANCEL_REASONS[0] : '')
  const [otherText, setOtherText] = useState('')
  const [restock, setRestock] = useState(true)

  if (!order) return null

  const finalReason = reason === OTHER ? otherText.trim() : reason
  // A refused parcel must say why; a cancel may leave the reason empty
  const missingReason = (returning || reason === OTHER) && !finalReason

  const confirm = () => {
    const change: StatusChange = { status }
    if (finalReason) change.reason = finalReason
    if (returning) change.restock = restock
    onConfirm(change)
  }

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>
        {returning ? `Mark order ${order.orderNumber} as returned?` : `Cancel order ${order.orderNumber}?`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography>
            {returning
              ? `${order.customerName}'s parcel came back without being delivered.`
              : `${order.customerName}'s order will be cancelled.`}{' '}
            This can't be undone.
            {!returning && order.status === 'Processing' && ' Its items will be returned to stock.'}
          </Typography>

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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Keep order
        </Button>
        <Button
          color={returning ? 'secondary' : 'error'}
          variant="contained"
          disabled={saving || missingReason}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={confirm}
        >
          {returning ? 'Mark returned' : 'Cancel order'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

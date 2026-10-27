import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { Order } from '@/types'

interface CallWarningDialogProps {
  // The order about to move to Processing without a call confirmation; null keeps it closed
  order: Order | null
  saving: boolean
  onClose: () => void
  // called: true when the admin says they did call and the customer confirmed
  onConfirm: (called: boolean) => void
}

// Asks before packing an order nobody has confirmed by phone. The website can't
// check that the number belongs to the person ordering, so the call is the check.
export default function CallWarningDialog({ order, saving, onClose, onConfirm }: CallWarningDialogProps) {
  if (!order) return null

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Has {order.customerName} confirmed by call?</DialogTitle>
      <DialogContent>
        <Typography>
          Order {order.orderNumber} is not marked as confirmed by call. Call {order.phone} before moving it to
          Processing: anyone can type someone else's number at checkout.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>
          Go back
        </Button>
        <Button onClick={() => onConfirm(false)} disabled={saving}>
          Move without call
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(true)}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          I called, they confirmed
        </Button>
      </DialogActions>
    </Dialog>
  )
}

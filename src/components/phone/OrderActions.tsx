import { useState } from 'react'
import { Button, CircularProgress, IconButton, Menu, MenuItem, Stack } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ContactButtons from './ContactButtons'
import type { Order, OrderStatus } from '@/types'
import { STEP_LABELS, exitSteps, nextStep } from '@/utils/orderStatus'

interface OrderActionsProps {
  order: Order
  canEdit: boolean
  saving: boolean
  onMove: (order: Order, status: OrderStatus) => void
}

// Call, WhatsApp and the one thing to do next. Cancelling or a refused parcel
// sits in a menu, so a thumb can't hit it by accident.
export default function OrderActions({ order, canEdit, saving, onMove }: OrderActionsProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const next = canEdit ? nextStep(order.status) : undefined
  const exits = canEdit ? exitSteps(order.status) : []

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <ContactButtons phone={order.phone} name={order.customerName} />
      {next ? (
        <Button
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={() => onMove(order, next)}
          sx={{ flex: 1, whiteSpace: 'nowrap' }}
        >
          {STEP_LABELS[next]}
        </Button>
      ) : (
        <Stack sx={{ flex: 1 }} />
      )}
      {exits.length > 0 && (
        <>
          <IconButton
            aria-label={`More actions for ${order.orderNumber}`}
            disabled={saving}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {exits.map((status) => (
              <MenuItem
                key={status}
                onClick={() => {
                  setMenuAnchor(null)
                  onMove(order, status)
                }}
              >
                {STEP_LABELS[status]}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Stack>
  )
}

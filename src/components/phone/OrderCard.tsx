import { Box, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import OrderActions from './OrderActions'
import type { Order, OrderStatus } from '@/types'
import { awaitingCall } from '@/utils/callConfirm'
import { formatDate, formatPrice } from '@/utils/format'
import { statusColor } from '@/utils/orderStatus'
import { hasPreorder } from '@/utils/preorder'

interface OrderCardProps {
  order: Order
  canEdit: boolean
  saving: boolean
  onOpen: (order: Order) => void
  onMove: (order: Order, status: OrderStatus) => void
}

const itemsLine = (order: Order): string => {
  const [first] = order.items
  if (!first) return 'No items'
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return pieces > 1 ? `${first.name} and ${pieces - 1} more` : first.name
}

export default function OrderCard({ order, canEdit, saving, onOpen, onMove }: OrderCardProps) {
  const notes = order.internalNotes?.length ?? 0
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        overflow: 'hidden',
        borderRadius: '12px',
        // The edge colour is the order's status, readable while scrolling fast
        borderLeft: `4px solid ${theme.palette[statusColor[order.status] as 'primary'].main}`,
        // A blocked number: still taken, shown in red so someone calls before shipping
        ...(order.blockedPhone && { bgcolor: alpha(theme.palette.error.main, 0.08) }),
      })}
    >
      <ButtonBase
        onClick={() => onOpen(order)}
        aria-label={`Open order ${order.orderNumber}`}
        sx={{ display: 'block', width: '100%', textAlign: 'left', p: 1.5, pb: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: '1.05rem' }}>{order.orderNumber}</Typography>
          {notes > 0 && <StickyNote2Icon fontSize="small" color="action" aria-label={`${notes} private notes`} />}
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">{formatDate(order.createdAt)}</Typography>
        </Stack>
        <Typography sx={{ fontWeight: 500, mt: 0.5 }} noWrap>{order.customerName}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{order.address}</Typography>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 0.5 }}>
          <Typography variant="body2" noWrap>{itemsLine(order)}</Typography>
          <Typography sx={{ fontWeight: 700, flexShrink: 0 }}>{formatPrice(order.total)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          <Chip size="small" label={order.status} color={statusColor[order.status]} />
          {hasPreorder(order) && <Chip size="small" variant="outlined" color="info" label="Pre-order" />}
          {awaitingCall(order) && <Chip size="small" variant="outlined" color="warning" label="Not called" />}
          {order.blockedPhone && <Chip size="small" color="error" label="Blocked number" />}
        </Stack>
      </ButtonBase>
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <OrderActions order={order} canEdit={canEdit} saving={saving} onMove={onMove} />
      </Box>
    </Paper>
  )
}

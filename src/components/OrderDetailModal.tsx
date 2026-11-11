import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useNotify } from '@/notify/context'
import PrintIcon from '@mui/icons-material/Print'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import OrderDetailsForm from '@/components/OrderDetailsForm'
import CourierSection from '@/components/CourierSection'
import OrderTimeline from '@/components/OrderTimeline'
import CustomerSummary from '@/components/CustomerSummary'
import CallConfirmedToggle from '@/components/CallConfirmedToggle'
import OrderActions from '@/components/phone/OrderActions'
import { useAccess } from '@/hooks/useMe'
import { useIsPhone } from '@/hooks/useIsPhone'
import type { Order, OrderStatus } from '@/types'
import { statusColor } from '@/utils/orderStatus'
import { SOURCE_LABELS, orderSource } from '@/utils/orderSource'
import { printOrderSlip } from '@/utils/orderExport'
import { formatDate, formatPrice } from '@/utils/format'
import { describeDelivery } from '@/utils/deliveryArea'

interface OrderDetailModalProps {
  order: Order | null
  open: boolean
  onClose: () => void
  saving: boolean
  // Moving the order on; the page asks whatever it needs to first
  onMove: (order: Order, status: OrderStatus) => void
}

export default function OrderDetailModal({ order, open, onClose, saving, onMove }: OrderDetailModalProps) {
  const [editing, setEditing] = useState(false)
  const isPhone = useIsPhone()
  const { can } = useAccess()
  const notify = useNotify()

  if (!order) return null

  // The API freezes delivered, cancelled and returned orders; editing also needs orders.edit
  const editable = can('orders.edit') && !['Delivered', 'Cancelled', 'Returned'].includes(order.status)

  const close = () => {
    setEditing(false)
    onClose()
  }

  const printSlip = () => {
    if (!printOrderSlip(order)) notify('Could not open the print window. Allow pop-ups for this site and try again.', 'error')
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth fullScreen={isPhone}>
      {isPhone ? (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', px: 1, height: 56, flexShrink: 0 }}
        >
          <IconButton color="inherit" onClick={close} aria-label="Close order">
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" component="h2" sx={{ flex: 1, letterSpacing: '0.04em' }}>
            {order.orderNumber}
          </Typography>
          <IconButton color="inherit" onClick={printSlip} aria-label="Print slip">
            <PrintIcon />
          </IconButton>
        </Stack>
      ) : (
        <DialogTitle>
          Order Details: {order.orderNumber}
        </DialogTitle>
      )}
      <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* This phone's order history and block mark */}
          <CustomerSummary phone={order.phone} />

          {/* Status */}
          <div>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Chip label={order.status} color={statusColor[order.status]} />
            <CallConfirmedToggle order={order} editable={editable} />
            {(order.cancelReason || order.status === 'Returned') && (
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  {order.cancelReason && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'medium', width: '30%' }}>Reason</TableCell>
                      <TableCell>{order.cancelReason}</TableCell>
                    </TableRow>
                  )}
                  {order.returnedAt && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'medium' }}>Returned on</TableCell>
                      <TableCell>{formatDate(order.returnedAt)}</TableCell>
                    </TableRow>
                  )}
                  {order.status === 'Returned' && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'medium' }}>Stock</TableCell>
                      <TableCell>{order.restocked ? 'Put back in stock' : 'Not put back'}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <CourierSection order={order} canEdit={can('orders.edit')} />

          {/* Customer Info */}
          <div>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Customer Information
              </Typography>
              {editable && !editing && (
                <Button size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </Stack>
            {editing ? (
              <OrderDetailsForm order={order} onDone={() => setEditing(false)} />
            ) : (
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium', width: '30%' }}>Name</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Phone</TableCell>
                  <TableCell>{order.phone}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Address</TableCell>
                  <TableCell>{order.address}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Delivery area</TableCell>
                  <TableCell>{describeDelivery(order)}</TableCell>
                </TableRow>
                {order.notes && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium' }}>Notes</TableCell>
                    <TableCell>{order.notes}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </div>

          <Divider />

          {/* Order Items */}
          <div>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Items
            </Typography>
            <Stack divider={<Divider />} spacing={1}>
              {order.items.map((item, index) => (
                <Stack key={index} direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                  <div>
                    <Typography>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatPrice(item.price)} × {item.quantity}
                    </Typography>
                    {item.preorder && (
                      <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label={item.preorderDays ? `Pre-order, about ${item.preorderDays} days` : 'Pre-order'}
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </div>
                  <Typography sx={{ fontWeight: 500, flexShrink: 0 }}>{formatPrice(item.price * item.quantity)}</Typography>
                </Stack>
              ))}
            </Stack>
          </div>

          <Divider />

          {/* Totals */}
          <div>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Subtotal</TableCell>
                  <TableCell align="right">{formatPrice(order.subtotal)}</TableCell>
                </TableRow>
                {Boolean(order.discount) && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium' }}>Discount</TableCell>
                    <TableCell align="right">-{formatPrice(order.discount ?? 0)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Delivery Fee</TableCell>
                  <TableCell align="right">{formatPrice(order.deliveryFee)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {formatPrice(order.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Payment & Date */}
          <div>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium', width: '30%' }}>Payment Method</TableCell>
                  <TableCell>{order.paymentMethod}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Order Date</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Source</TableCell>
                  <TableCell>
                    {SOURCE_LABELS[orderSource(order)]}
                    {order.createdBy && ` (entered by ${order.createdBy})`}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Divider />

          <OrderTimeline order={order} canAddNotes={can('orders.edit')} />
        </Stack>
      </DialogContent>
      {isPhone ? (
        <Stack sx={{ p: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: 1, borderColor: 'divider' }}>
          <OrderActions order={order} canEdit={can('orders.edit')} saving={saving} onMove={onMove} />
        </Stack>
      ) : (
        <DialogActions>
          <Button startIcon={<PrintIcon />} onClick={printSlip}>
            Print slip
          </Button>
          <Button onClick={close}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  )
}

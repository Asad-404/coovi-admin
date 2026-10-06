import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import PrintIcon from '@mui/icons-material/Print'
import EditIcon from '@mui/icons-material/Edit'
import OrderDetailsForm from '@/components/OrderDetailsForm'
import type { Order } from '@/types'
import { statusColor } from '@/utils/orderStatus'
import { printOrderSlip } from '@/utils/orderExport'
import { formatDate, formatPrice } from '@/utils/format'

interface OrderDetailModalProps {
  order: Order | null
  open: boolean
  onClose: () => void
}

export default function OrderDetailModal({ order, open, onClose }: OrderDetailModalProps) {
  const [editing, setEditing] = useState(false)

  if (!order) return null

  // The API freezes delivered and cancelled orders
  const editable = order.status !== 'Delivered' && order.status !== 'Cancelled'

  const close = () => {
    setEditing(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>
        Order Details: {order.orderNumber}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Status */}
          <div>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Chip label={order.status} color={statusColor[order.status]} />
          </div>

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
            <Table size="small">
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">
                      {formatPrice(item.price)} × {item.quantity}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                      {formatPrice(item.price * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              </TableBody>
            </Table>
          </div>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<PrintIcon />} onClick={() => printOrderSlip(order)}>
          Print slip
        </Button>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

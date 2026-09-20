import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Alert,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import type { ChipProps } from '@mui/material'
import { ordersApi } from '@/api/orders'
import { formatDate, formatPrice } from '@/utils/format'
import type { Order, OrderStatus } from '@/types'

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

const statusColor: Record<OrderStatus, ChipProps['color']> = {
  Pending: 'warning',
  Processing: 'info',
  Shipped: 'primary',
  Delivered: 'success',
  Cancelled: 'error',
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll(),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Status update failed')
      } else {
        setError('Status update failed')
      }
    },
  })

  const handleChange = (order: Order, status: OrderStatus) => {
    if (status !== order.status) {
      statusMutation.mutate({ id: order._id, status })
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Orders</Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : isError ? (
        <Alert severity="error">
          Could not load orders — is the API running? (This endpoint needs a valid admin token.)
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Change Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders?.map((order) => {
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <TableRow key={order._id} hover>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <Tooltip title={order.address}>
                        <Stack>
                          <Typography variant="body1">{order.customerName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {order.phone}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {itemCount} item{itemCount === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell>{formatPrice(order.total)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={order.status} color={statusColor[order.status]} />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={order.status}
                        onChange={(e) => handleChange(order, e.target.value as OrderStatus)}
                        disabled={statusMutation.isPending}
                        sx={{ minWidth: 140 }}
                      >
                        {STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                )
              })}
              {orders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                      No orders yet — place one through the storefront to see it here.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="body2" color="text.secondary">
        Note: moving Pending → Processing automatically decreases stock; Processing → Cancelled
        restores it.
      </Typography>
    </Stack>
  )
}

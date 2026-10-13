import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import DownloadIcon from '@mui/icons-material/Download'
import AddIcon from '@mui/icons-material/Add'
import { ordersApi } from '@/api/orders'
import { useOrders } from '@/hooks/useOrders'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { formatDate, formatPrice } from '@/utils/format'
import type { DeliveryArea, Order, OrderSource, OrderStatus } from '@/types'
import OrderDetailModal from '@/components/OrderDetailModal'
import { downloadCsv, ordersToCsv } from '@/utils/orderExport'
import { filterOrders } from '@/utils/orderFilters'
import { DELIVERY_AREA_LABELS } from '@/utils/deliveryArea'
import { NEXT_STATUSES, STATUSES, statusColor } from '@/utils/orderStatus'
import { hasPreorder } from '@/utils/preorder'
import { ORDER_SOURCES, SOURCE_LABELS, orderSource } from '@/utils/orderSource'

const isStatus = (value: string | null): value is OrderStatus =>
  STATUSES.includes(value as OrderStatus)

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [areaFilter, setAreaFilter] = useState<DeliveryArea | 'All'>('All')
  const [sourceFilter, setSourceFilter] = useState<OrderSource | 'All'>('All')

  // The status filter lives in the URL so the dashboard can link to e.g. /orders?status=Pending
  const statusParam = searchParams.get('status')
  const statusFilter: OrderStatus | 'All' = isStatus(statusParam) ? statusParam : 'All'
  const setStatusFilter = (status: OrderStatus | 'All') =>
    setSearchParams(status === 'All' ? {} : { status }, { replace: true })

  const { data: orders, isLoading, isError } = useOrders()

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: (order) => {
      setError('')
      setCancelTarget(null)
      notify(`${order.orderNumber} is now ${order.status}`)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      setCancelTarget(null)
      setError(getErrorMessage(err, 'Status update failed'))
      // A 409 usually means the order changed elsewhere — show its current state
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  // Looked up from the list so the details window shows fresh data after an edit
  const selectedOrder = orders?.find((o) => o._id === selectedId) ?? null

  // Only the row being saved is locked, the rest of the table stays usable
  const savingId = statusMutation.isPending ? statusMutation.variables?.id : undefined

  const handleChange = (order: Order, status: OrderStatus) => {
    if (status === order.status) return
    if (status === 'Cancelled') {
      setCancelTarget(order)
      return
    }
    statusMutation.mutate({ id: order._id, status })
  }

  const filteredOrders = orders
    ? filterOrders(orders, {
        search: searchTerm,
        status: statusFilter,
        area: areaFilter,
        from: fromDate,
        to: toDate,
        source: sourceFilter,
      })
    : undefined

  const hasFilters = Boolean(
    searchTerm || fromDate || toDate || statusFilter !== 'All' || areaFilter !== 'All' || sourceFilter !== 'All',
  )

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Orders</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/orders/new">
            Add order
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!filteredOrders?.length}
            onClick={() =>
              downloadCsv(`coovi-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(filteredOrders ?? []))
            }
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          placeholder="Search by order #, name, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'All')}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="All">All Status</MenuItem>
          {STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value as DeliveryArea | 'All')}
          size="small"
          sx={{ minWidth: 150 }}
          inputProps={{ 'aria-label': 'Delivery area' }}
        >
          <MenuItem value="All">All areas</MenuItem>
          {(Object.keys(DELIVERY_AREA_LABELS) as DeliveryArea[]).map((area) => (
            <MenuItem key={area} value={area}>
              {DELIVERY_AREA_LABELS[area]}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as OrderSource | 'All')}
          size="small"
          sx={{ minWidth: 150 }}
          inputProps={{ 'aria-label': 'Source' }}
        >
          <MenuItem value="All">All sources</MenuItem>
          {ORDER_SOURCES.map((source) => (
            <MenuItem key={source} value={source}>
              {SOURCE_LABELS[source]}
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="From"
          type="date"
          size="small"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: toDate || undefined } }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: fromDate || undefined } }}
        />
        {hasFilters && (
          <Button
            onClick={() => {
              setSearchTerm('')
              setFromDate('')
              setToDate('')
              setAreaFilter('All')
              setStatusFilter('All')
              setSourceFilter('All')
            }}
          >
            Clear
          </Button>
        )}
      </Stack>

      {isLoading ? (
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </Paper>
      ) : isError ? (
        <Alert severity="error">
          Could not load orders — is the API running? (This endpoint needs a valid admin token.)
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredOrders?.length ?? 0} of {orders?.length ?? 0} orders
          </Typography>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Change Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders?.map((order) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                  const nextStatuses = NEXT_STATUSES[order.status]
                  const saving = savingId === order._id
                  return (
                    <TableRow key={order._id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <span>{order.orderNumber}</span>
                          {Boolean(order.internalNotes?.length) && (
                            <Tooltip title={`${order.internalNotes!.length} private note${order.internalNotes!.length === 1 ? '' : 's'}`}>
                              <StickyNote2Icon fontSize="small" color="action" aria-label="Has private notes" />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
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
                      <TableCell>{SOURCE_LABELS[orderSource(order)]}</TableCell>
                      <TableCell>
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Chip size="small" label={order.status} color={statusColor[order.status]} />
                          {hasPreorder(order) && <Chip size="small" variant="outlined" color="info" label="Pre-order" />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {nextStatuses.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Final
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Select
                              size="small"
                              value={order.status}
                              onChange={(e) => handleChange(order, e.target.value as OrderStatus)}
                              disabled={saving}
                              sx={{ minWidth: 140 }}
                            >
                              <MenuItem value={order.status} disabled>
                                {order.status}
                              </MenuItem>
                              {nextStatuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                  → {status}
                                </MenuItem>
                              ))}
                            </Select>
                            {saving && <CircularProgress size={18} />}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton onClick={() => setSelectedId(order._id)} size="small" aria-label={`View ${order.orderNumber}`}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredOrders?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                        {hasFilters
                          ? 'No orders match your filters.'
                          : 'No orders yet — place one through the storefront to see it here.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="body2" color="text.secondary">
        Orders move forward only: Pending → Processing → Shipped → Delivered, or Cancelled from
        Pending/Processing. Pending → Processing takes the items out of stock; Processing → Cancelled
        puts them back.
      </Typography>

      {/* Cancel confirmation — cancelling is final and can change stock */}
      <Dialog open={cancelTarget !== null} onClose={() => !statusMutation.isPending && setCancelTarget(null)}>
        <DialogTitle>Cancel order {cancelTarget?.orderNumber}?</DialogTitle>
        <DialogContent>
          <Typography>
            {cancelTarget?.customerName}'s order will be cancelled. This can't be undone.
            {cancelTarget?.status === 'Processing' && ' Its items will be returned to stock.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={statusMutation.isPending}>
            Keep order
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={statusMutation.isPending}
            startIcon={statusMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => cancelTarget && statusMutation.mutate({ id: cancelTarget._id, status: 'Cancelled' })}
          >
            Cancel order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedId(null)}
      />
    </Stack>
  )
}

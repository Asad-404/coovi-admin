import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import VisibilityIcon from '@mui/icons-material/Visibility'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import DownloadIcon from '@mui/icons-material/Download'
import AddIcon from '@mui/icons-material/Add'
import { ordersApi } from '@/api/orders'
import { useOrderPage } from '@/hooks/useOrders'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { formatDate, formatPrice } from '@/utils/format'
import type { DeliveryArea, Order, OrderSource, OrderStatus, StatusUpdate } from '@/types'
import OrderDetailModal from '@/components/OrderDetailModal'
import StatusChangeDialog from '@/components/StatusChangeDialog'
import CallWarningDialog from '@/components/CallWarningDialog'
import { downloadCsv, ordersToCsv } from '@/utils/orderExport'
import { useAccess } from '@/hooks/useMe'
import { toOrderQuery } from '@/utils/orderFilters'
import { DELIVERY_AREA_LABELS } from '@/utils/deliveryArea'
import { NEXT_STATUSES, STATUSES, statusColor } from '@/utils/orderStatus'
import { hasPreorder } from '@/utils/preorder'
import { awaitingCall, needsCallWarning } from '@/utils/callConfirm'
import { blockLabel } from '@/utils/customers'
import { ORDER_SOURCES, SOURCE_LABELS, orderSource } from '@/utils/orderSource'

const isStatus = (value: string | null): value is OrderStatus =>
  STATUSES.includes(value as OrderStatus)

const PAGE_SIZES = [25, 50, 100]

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const { can } = useAccess()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState('')
  // The order whose details are open; refreshed from the page below while it is on it
  const [selected, setSelected] = useState<Order | null>(null)
  const [exporting, setExporting] = useState(false)
  // Cancelling or returning asks for a reason first
  const [pendingChange, setPendingChange] = useState<{ order: Order; status: 'Cancelled' | 'Returned' } | null>(null)
  // Moving an order nobody confirmed by call to Processing asks first
  const [uncalledOrder, setUncalledOrder] = useState<Order | null>(null)
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

  // The API searches and filters; the search waits until typing stops
  const search = useDebouncedValue(searchTerm)
  const query = toOrderQuery({
    search,
    status: statusFilter,
    area: areaFilter,
    from: fromDate,
    to: toDate,
    source: sourceFilter,
  })

  // Changing any filter goes back to the first page
  const queryKey = JSON.stringify(query)
  const [paging, setPaging] = useState({ queryKey, page: 0 })
  const page = paging.queryKey === queryKey ? paging.page : 0
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const { data, isLoading, isError, isFetching } = useOrderPage(query, page + 1, pageSize)
  const orders = data?.orders
  const total = data?.total ?? 0

  const statusMutation = useMutation({
    // markCalled: record the call confirmation first, so a failed status change still keeps it
    mutationFn: async ({ id, change, markCalled }: { id: string; change: StatusUpdate; markCalled?: boolean }) => {
      if (markCalled) await ordersApi.setCallConfirmed(id, true)
      return ordersApi.updateStatus(id, change)
    },
    onSuccess: (order) => {
      setError('')
      setPendingChange(null)
      setUncalledOrder(null)
      notify(`${order.orderNumber} is now ${order.status}`)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      setPendingChange(null)
      setUncalledOrder(null)
      setError(getErrorMessage(err, 'Status update failed'))
      // A 409 usually means the order changed elsewhere — show its current state
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  // Looked up from the page so the details window shows fresh data after an edit
  const selectedOrder = (selected && orders?.find((o) => o._id === selected._id)) ?? selected

  // Only the row being saved is locked, the rest of the table stays usable
  const savingId = statusMutation.isPending ? statusMutation.variables?.id : undefined

  const handleChange = (order: Order, status: OrderStatus) => {
    if (status === order.status) return
    if (status === 'Cancelled' || status === 'Returned') {
      setPendingChange({ order, status })
      return
    }
    if (needsCallWarning(order, status)) {
      setUncalledOrder(order)
      return
    }
    statusMutation.mutate({ id: order._id, change: { status } })
  }

  // The file has every order matching the filters, not just this page
  const exportCsv = async () => {
    setExporting(true)
    try {
      const all = await ordersApi.getAllMatching(query)
      downloadCsv(`coovi-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(all))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not export the orders'))
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = Boolean(
    searchTerm || fromDate || toDate || statusFilter !== 'All' || areaFilter !== 'All' || sourceFilter !== 'All',
  )

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Orders</Typography>
        <Stack direction="row" spacing={1}>
          {can('orders.edit') && (
            <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/orders/new">
              Add order
            </Button>
          )}
          {/* Needs orders.export: a file of every customer's name, phone and address */}
          {can('orders.export') && (
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={18} /> : <DownloadIcon />}
              disabled={total === 0 || exporting}
              onClick={exportCsv}
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          )}
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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {total === 0
                ? 'No orders'
                : `Showing ${page * pageSize + 1} to ${Math.min((page + 1) * pageSize, total)} of ${total} order${total === 1 ? '' : 's'}${hasFilters ? ' matching your filters' : ''}`}
            </Typography>
            {isFetching && <CircularProgress size={14} aria-label="Loading" />}
          </Stack>

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
                {orders?.map((order) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                  const nextStatuses = NEXT_STATUSES[order.status]
                  const saving = savingId === order._id
                  return (
                    <TableRow
                      key={order._id}
                      hover
                      // A blocked number: still taken, shown in red so someone calls before shipping
                      sx={order.blockedPhone ? { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) } : undefined}
                    >
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
                          {awaitingCall(order) && (
                            <Tooltip title="Not confirmed by call yet">
                              <Chip size="small" variant="outlined" color="warning" label="Not called" />
                            </Tooltip>
                          )}
                          {order.blockedPhone && (
                            <Tooltip title={`${blockLabel(order.blockedPhone.note)}. Call before shipping.`}>
                              <Chip size="small" color="error" label="Blocked number" />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {nextStatuses.length === 0 || !can('orders.edit') ? (
                          <Typography variant="body2" color="text.secondary">
                            {nextStatuses.length === 0 ? 'Final' : 'View only'}
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
                          <IconButton onClick={() => setSelected(order)} size="small" aria-label={`View ${order.orderNumber}`}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {orders?.length === 0 && (
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
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={PAGE_SIZES}
              onPageChange={(_, next) => setPaging({ queryKey, page: next })}
              onRowsPerPageChange={(e) => {
                setPageSize(Number(e.target.value))
                setPaging({ queryKey, page: 0 })
              }}
            />
          </TableContainer>
        </>
      )}

      <Typography variant="body2" color="text.secondary">
        Orders move forward only: Pending → Processing → Shipped → Delivered, or Cancelled from
        Pending/Processing. Pending → Processing takes the items out of stock; Processing → Cancelled
        puts them back. A parcel refused at the door is Shipped → Returned, which puts the items back unless
        you untick it. Delivered is final: the shop takes no returns after delivery.
      </Typography>

      {/* Cancel or mark returned: asks for the reason and restock */}
      <CallWarningDialog
        order={uncalledOrder}
        saving={statusMutation.isPending}
        onClose={() => setUncalledOrder(null)}
        onConfirm={(called) =>
          uncalledOrder &&
          statusMutation.mutate({ id: uncalledOrder._id, change: { status: 'Processing' }, markCalled: called })
        }
      />

      <StatusChangeDialog
        key={pendingChange ? `${pendingChange.order._id}-${pendingChange.status}` : 'closed'}
        order={pendingChange?.order ?? null}
        status={pendingChange?.status ?? 'Cancelled'}
        saving={statusMutation.isPending}
        onClose={() => setPendingChange(null)}
        onConfirm={(change) => pendingChange && statusMutation.mutate({ id: pendingChange.order._id, change })}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelected(null)}
      />
    </Stack>
  )
}

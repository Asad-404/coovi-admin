import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
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
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { courierPaymentsApi } from '@/api/courierPayments'
import { getErrorMessage } from '@/api/errors'
import RecordPaymentDialog from '@/components/RecordPaymentDialog'
import { useNotify } from '@/notify/context'
import { formatDate, formatPrice } from '@/utils/format'
import type { CourierPayment } from '@/types'

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Paper sx={{ p: 2, flex: 1 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5">{value}</Typography>
      {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}
    </Paper>
  )
}

export default function CourierPaymentsPage() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [selected, setSelected] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourierPayment | null>(null)
  const [error, setError] = useState('')

  const unpaid = useQuery({ queryKey: ['courier-payments', 'unpaid'], queryFn: courierPaymentsApi.unpaid })
  const payments = useQuery({ queryKey: ['courier-payments', 'list'], queryFn: courierPaymentsApi.list })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courierPaymentsApi.remove(id),
    onSuccess: () => {
      setDeleteTarget(null)
      notify('Payment deleted; its orders are unpaid again')
      queryClient.invalidateQueries({ queryKey: ['courier-payments'] })
    },
    onError: (err) => {
      setDeleteTarget(null)
      setError(getErrorMessage(err, 'Could not delete the payment'))
    },
  })

  const unpaidOrders = unpaid.data?.orders ?? []
  // Ticks for orders that have since been paid drop out on their own
  const selectedOrders = unpaidOrders.filter((o) => selected.includes(o._id))
  const allSelected = unpaidOrders.length > 0 && selectedOrders.length === unpaidOrders.length

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const summary = payments.data?.summary

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Courier payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRecording(true)}>
          Record payment{selectedOrders.length ? ` (${selectedOrders.length})` : ''}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        The courier collects the cash on delivery and pays it to you later, minus its charges. Record each payment
        here so you can see which delivered orders the courier still owes you for.
      </Typography>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <StatCard
          label="Delivered, not yet paid"
          value={unpaid.data ? formatPrice(unpaid.data.expectedTotal) : '…'}
          hint={unpaid.data ? `${unpaid.data.count} order${unpaid.data.count === 1 ? '' : 's'}, at full order value` : undefined}
        />
        <StatCard label="Received from courier" value={summary ? formatPrice(summary.amountReceived) : '…'} hint="All time" />
        <StatCard label="Courier charges" value={summary ? formatPrice(summary.chargeTotal) : '…'} hint="All time" />
      </Stack>

      <Typography variant="h6">Delivered orders waiting for payment</Typography>
      {unpaid.isLoading ? (
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={48} />)}
        </Paper>
      ) : unpaid.isError ? (
        <Alert severity="error">Could not load unpaid orders — is the API running?</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedOrders.length > 0 && !allSelected}
                    disabled={unpaidOrders.length === 0}
                    onChange={() => setSelected(allSelected ? [] : unpaidOrders.map((o) => o._id))}
                    slotProps={{ input: { 'aria-label': 'Select all unpaid orders' } }}
                  />
                </TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Ordered</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell align="right">Order total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unpaidOrders.map((order) => (
                <TableRow key={order._id} hover onClick={() => toggle(order._id)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(order._id)}
                      slotProps={{ input: { 'aria-label': `Select ${order.orderNumber}` } }}
                    />
                  </TableCell>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body1">{order.customerName}</Typography>
                    <Typography variant="body2" color="text.secondary">{order.phone}</Typography>
                  </TableCell>
                  <TableCell align="right">{formatPrice(order.total)}</TableCell>
                </TableRow>
              ))}
              {unpaidOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                      Every delivered order has been paid for.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6">Payments received</Typography>
      {payments.isLoading ? (
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={48} />)}
        </Paper>
      ) : payments.isError ? (
        <Alert severity="error">Could not load payments — is the API running?</Alert>
      ) : (
        <>
          {payments.data && payments.data.total > payments.data.payments.length && (
            <Typography variant="body2" color="text.secondary">
              Showing the latest {payments.data.payments.length} of {payments.data.total} payments. The totals above
              include all of them.
            </Typography>
          )}
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Date</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Collected</TableCell>
                  <TableCell align="right">Charges</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.data?.payments.map((payment) => {
                  const open = expandedId === payment._id
                  return (
                    <Fragment key={payment._id}>
                      <TableRow hover>
                        <TableCell padding="checkbox">
                          <IconButton
                            size="small"
                            aria-label={open ? 'Hide orders' : 'Show orders'}
                            onClick={() => setExpandedId(open ? null : payment._id)}
                          >
                            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{formatDate(payment.paidAt)}</TableCell>
                        <TableCell>
                          <Typography variant="body1">{payment.reference || '—'}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {[payment.courier, payment.method].filter(Boolean).join(', ')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{payment.lines.length}</TableCell>
                        <TableCell align="right">{formatPrice(payment.collectedTotal)}</TableCell>
                        <TableCell align="right">{formatPrice(payment.chargeTotal)}</TableCell>
                        <TableCell align="right">
                          <Stack sx={{ alignItems: 'flex-end' }} spacing={0.5}>
                            <span>{formatPrice(payment.amountReceived)}</span>
                            {payment.difference !== 0 && (
                              <Chip
                                size="small"
                                color={payment.difference < 0 ? 'error' : 'warning'}
                                label={`${payment.difference < 0 ? 'Short' : 'Over'} ${formatPrice(Math.abs(payment.difference))}`}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Delete a payment entered by mistake">
                            <IconButton size="small" aria-label="Delete payment" onClick={() => setDeleteTarget(payment)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
                          <Collapse in={open} unmountOnExit>
                            <Table size="small" sx={{ my: 1 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Order #</TableCell>
                                  <TableCell align="right">Order total</TableCell>
                                  <TableCell align="right">Collected</TableCell>
                                  <TableCell align="right">Charge</TableCell>
                                  <TableCell align="right">Net</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {payment.lines.map((line) => (
                                  <TableRow key={line.order}>
                                    <TableCell>{line.orderNumber}</TableCell>
                                    <TableCell align="right">{formatPrice(line.orderTotal)}</TableCell>
                                    <TableCell align="right">{formatPrice(line.collected)}</TableCell>
                                    <TableCell align="right">{formatPrice(line.charge)}</TableCell>
                                    <TableCell align="right">{formatPrice(line.net)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {(payment.notes || payment.recordedBy) && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {[payment.notes, payment.recordedBy && `Recorded by ${payment.recordedBy}`]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Typography>
                            )}
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  )
                })}
                {payments.data?.payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                        No courier payments recorded yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {recording && (
        <RecordPaymentDialog
          orders={selectedOrders}
          onClose={() => {
            setRecording(false)
            setSelected([])
          }}
        />
      )}

      <Dialog open={deleteTarget !== null} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}>
        <DialogTitle>Delete this payment?</DialogTitle>
        <DialogContent>
          <Typography>
            The {deleteTarget ? formatPrice(deleteTarget.amountReceived) : ''} payment from{' '}
            {deleteTarget ? formatDate(deleteTarget.paidAt) : ''} will be removed and its{' '}
            {deleteTarget?.lines.length} orders will show as unpaid again. Only do this to fix a mistake, then
            record it again correctly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Keep</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
          >
            Delete payment
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

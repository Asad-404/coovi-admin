import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { courierPaymentsApi } from '@/api/courierPayments'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { formatPrice } from '@/utils/format'
import { PAYMENT_METHODS, type PaymentMethod, type UnpaidOrder } from '@/types'
import {
  draftError,
  draftToPayment,
  draftTotals,
  emptyDraft,
  parseAmount,
  type PaymentDraft,
  type PaymentLineDraft,
} from '@/utils/courierPayments'

interface Props {
  // the delivered orders ticked on the page; more can be added by order number
  orders: UnpaidOrder[]
  onClose: () => void
}

// Rendered only while open, so every opening starts from a fresh draft
export default function RecordPaymentDialog({ orders, onClose }: Props) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [draft, setDraft] = useState<PaymentDraft>(() => emptyDraft(orders))
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: courierPaymentsApi.create,
    onSuccess: (payment) => {
      notify(`Payment of ${formatPrice(payment.amountReceived)} recorded for ${payment.lines.length} orders`)
      queryClient.invalidateQueries({ queryKey: ['courier-payments'] })
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not record the payment')),
  })

  const set = (changes: Partial<PaymentDraft>) => setDraft((d) => ({ ...d, ...changes }))
  const setLine = (index: number, changes: Partial<PaymentLineDraft>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l, i) => (i === index ? { ...l, ...changes } : l)) }))

  const totals = draftTotals(draft.lines)
  const received = parseAmount(draft.amountReceived)
  const difference = received === null ? 0 : Math.round((received - totals.net) * 100) / 100

  const submit = () => {
    const problem = draftError(draft)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    mutation.mutate(draftToPayment(draft))
  }

  return (
    <Dialog open onClose={() => !mutation.isPending && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>Record courier payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Copy each parcel from the courier's payment statement: the cash it collected and everything it kept
            (delivery, COD and return charges). For a parcel the customer refused, add it by order number with 0
            collected and the return charge.
          </Typography>

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Date received"
              type="date"
              size="small"
              required
              value={draft.paidAt}
              onChange={(e) => set({ paidAt: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label="Paid by"
              size="small"
              value={draft.method}
              onChange={(e) => set({ method: e.target.value as PaymentMethod | '' })}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Not set</MenuItem>
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Statement or transaction ID"
              size="small"
              value={draft.reference}
              onChange={(e) => set({ reference: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Cash collected</TableCell>
                <TableCell>Courier charge</TableCell>
                <TableCell align="right">Net</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.lines.map((line, index) => {
                const collected = parseAmount(line.collected)
                const short = line.orderTotal !== undefined && collected !== null && collected !== line.orderTotal
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="ORD-..."
                        value={line.orderNumber}
                        onChange={(e) => setLine(index, { orderNumber: e.target.value, orderTotal: undefined })}
                        slotProps={{ htmlInput: { 'aria-label': `Order number, row ${index + 1}` } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={line.collected}
                        onChange={(e) => setLine(index, { collected: e.target.value })}
                        helperText={short ? `Order total is ${formatPrice(line.orderTotal!)}` : undefined}
                        color={short ? 'warning' : undefined}
                        slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `Cash collected, row ${index + 1}` } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="0"
                        value={line.charge}
                        onChange={(e) => setLine(index, { charge: e.target.value })}
                        slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `Courier charge, row ${index + 1}` } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatPrice((parseAmount(line.collected) ?? 0) - (parseAmount(line.charge) ?? 0))}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() => set({ lines: draft.lines.filter((_, i) => i !== index) })}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow>
                <TableCell colSpan={5}>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => set({ lines: [...draft.lines, { orderNumber: '', collected: '0', charge: '' }] })}
                  >
                    Add order by number
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
            <Typography variant="body2">Cash collected: {formatPrice(totals.collected)}</Typography>
            <Typography variant="body2">Courier charges: −{formatPrice(totals.charge)}</Typography>
            <Typography variant="subtitle1">Should arrive: {formatPrice(totals.net)}</Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
            <TextField
              label="Amount that actually arrived"
              size="small"
              placeholder={String(totals.net)}
              value={draft.amountReceived}
              onChange={(e) => set({ amountReceived: e.target.value })}
              helperText={
                difference !== 0
                  ? `${formatPrice(Math.abs(difference))} ${difference < 0 ? 'less' : 'more'} than the statement`
                  : 'Leave blank if it matches the statement'
              }
              color={difference !== 0 ? 'warning' : undefined}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Notes"
              size="small"
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save payment
        </Button>
      </DialogActions>
    </Dialog>
  )
}

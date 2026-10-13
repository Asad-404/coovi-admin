import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { formatPrice } from '@/utils/format'
import { MANUAL_SOURCES, SOURCE_LABELS, previewTotals } from '@/utils/orderSource'
import { lineAvailability } from '@/utils/preorder'
import type { ManualOrderSource, Product } from '@/types'

interface Line {
  product: Product
  quantity: string
}

// Same rules as the API's order schema, checked here for a friendlier message
const PHONE_PATTERN = /^01\d{9}$/
const MAX_QUANTITY = 99

const toWholeTaka = (value: string): number | null => {
  if (value.trim() === '') return 0
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

// An order taken by Facebook, WhatsApp or phone. The admin picks sarees and
// quantities; the API prices them from the database, so the total shown here
// is a preview and the saved order is what the API answers.
export default function OrderFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()

  const [lines, setLines] = useState<Line[]>([])
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState<ManualOrderSource | ''>('')
  // null until the admin types a fee: then the shop's normal fee applies
  const [deliveryFeeText, setDeliveryFeeText] = useState<string | null>(null)
  const [discountText, setDiscountText] = useState('')
  const [error, setError] = useState('')

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  })
  const { data: shopFee } = useQuery({
    queryKey: ['delivery-fee'],
    queryFn: ordersApi.getDeliveryFee,
  })

  const createMutation = useMutation({
    mutationFn: ordersApi.createManual,
    onSuccess: (order) => {
      notify(`${order.orderNumber} added for ${formatPrice(order.total)}`)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not add the order')),
  })

  // Products switched off sale can't be ordered; the API would refuse them
  const sellable = (products ?? []).filter((p) => p.inStock && !lines.some((l) => l.product._id === p._id))

  const addProduct = (product: Product | null) => {
    if (product) setLines((current) => [...current, { product, quantity: '1' }])
  }
  const setQuantity = (id: string, quantity: string) =>
    setLines((current) => current.map((l) => (l.product._id === id ? { ...l, quantity } : l)))
  const removeLine = (id: string) => setLines((current) => current.filter((l) => l.product._id !== id))

  const feeText = deliveryFeeText ?? (shopFee === undefined ? '' : String(shopFee))
  const deliveryFee = toWholeTaka(feeText)
  const discount = toWholeTaka(discountText)
  const totals = previewTotals(
    lines.map((l) => ({ price: l.product.price, quantity: Number(l.quantity) || 0 })),
    deliveryFee ?? 0,
    discount ?? 0,
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const items = lines.map((l) => ({ productId: l.product._id, quantity: Number(l.quantity) }))
    const problem =
      (items.length === 0 && 'Add at least one saree') ||
      (items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QUANTITY) &&
        `Quantities must be whole numbers from 1 to ${MAX_QUANTITY}`) ||
      (lines.some((l) => lineAvailability(l.product, Number(l.quantity)) === 'short') &&
        'One of the sarees does not have enough stock and does not take pre-orders') ||
      (!customerName.trim() && 'Customer name is required') ||
      (!PHONE_PATTERN.test(phone) && 'Phone must be 11 digits starting with 01') ||
      (address.trim().length < 5 && 'Address must be at least 5 characters') ||
      (!source && 'Choose where the order came from') ||
      (deliveryFee === null && 'Delivery fee must be a whole number of taka, 0 or more') ||
      (discount === null && 'Discount must be a whole number of taka, 0 or more') ||
      ((discount ?? 0) > totals.subtotal && "Discount can't be more than the sarees' subtotal")

    if (problem || !source) {
      setError(problem || 'Choose where the order came from')
      return
    }

    createMutation.mutate({
      customerName: customerName.trim(),
      phone,
      address: address.trim(),
      ...(notes.trim() && { notes: notes.trim() }),
      source,
      items,
      // Only sent when changed, so the API applies the shop's current fee otherwise
      ...(deliveryFeeText !== null && { deliveryFeeOverride: deliveryFee ?? 0 }),
      ...(discount ? { discount } : {}),
    })
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit} noValidate>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/orders')} aria-label="Back to orders">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">Add order</Typography>
      </Stack>

      <Typography color="text.secondary">
        For orders taken by Facebook, WhatsApp or phone. Prices come from the shop's product list. The order
        starts as Pending; stock is taken when you confirm it, the same as a website order.
      </Typography>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Sarees */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Sarees</Typography>
            <Autocomplete
              options={sellable}
              loading={productsLoading}
              value={null}
              blurOnSelect
              onChange={(_, product) => addProduct(product)}
              getOptionLabel={(p) => p.name}
              getOptionDisabled={(p) => lineAvailability(p, 1) === 'short'}
              renderOption={({ key, ...props }, p) => (
                <li key={key} {...props}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', width: '100%', gap: 2 }}>
                    <span>{p.name}</span>
                    <Typography variant="body2" color="text.secondary">
                      {formatPrice(p.price)} ·{' '}
                      {p.stock > 0 ? `${p.stock} in stock` : p.allowPreorder ? 'pre-order only' : 'out of stock'}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Search sarees to add" />}
            />

            {lines.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Saree</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell sx={{ width: 110 }}>Quantity</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line) => {
                    const quantity = Number(line.quantity) || 0
                    const availability = lineAvailability(line.product, quantity)
                    return (
                      <TableRow key={line.product._id}>
                        <TableCell>
                          {line.product.name}
                          {availability === 'preorder' && (
                            <Chip
                              size="small"
                              color="info"
                              variant="outlined"
                              label={`Pre-order, about ${line.product.preorderDays ?? 15} days`}
                              sx={{ ml: 1 }}
                            />
                          )}
                          {availability === 'short' && (
                            <Chip size="small" color="error" label={`Only ${line.product.stock} left`} sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell align="right">{formatPrice(line.product.price)}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={line.quantity}
                            onChange={(e) => setQuantity(line.product._id, e.target.value)}
                            slotProps={{ htmlInput: { min: 1, max: MAX_QUANTITY, 'aria-label': `${line.product.name} quantity` } }}
                          />
                        </TableCell>
                        <TableCell align="right">{formatPrice(line.product.price * quantity)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove">
                            <IconButton size="small" onClick={() => removeLine(line.product._id)} aria-label={`Remove ${line.product.name}`}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Customer */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Customer</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Name"
                required
                fullWidth
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                label="Phone"
                required
                fullWidth
                value={phone}
                onChange={(e) => setPhone(e.target.value.trim())}
                placeholder="01XXXXXXXXX"
                slotProps={{ htmlInput: { maxLength: 11, inputMode: 'numeric' } }}
              />
              <TextField
                select
                label="Order came from"
                required
                fullWidth
                value={source}
                onChange={(e) => setSource(e.target.value as ManualOrderSource)}
              >
                {MANUAL_SOURCES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Delivery address"
              required
              multiline
              minRows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <TextField
              label="Notes (optional)"
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Total</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Delivery fee (৳)"
                type="number"
                value={feeText}
                onChange={(e) => setDeliveryFeeText(e.target.value)}
                helperText={shopFee !== undefined ? `Shop's normal fee is ${formatPrice(shopFee)}` : ' '}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
              <TextField
                label="Discount (৳)"
                type="number"
                value={discountText}
                onChange={(e) => setDiscountText(e.target.value)}
                helperText="Agreed with the customer, taken off the sarees"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Stack>
            <Table size="small" sx={{ maxWidth: 400, ml: 'auto' }}>
              <TableBody>
                <TableRow>
                  <TableCell>Subtotal</TableCell>
                  <TableCell align="right">{formatPrice(totals.subtotal)}</TableCell>
                </TableRow>
                {totals.discount > 0 && (
                  <TableRow>
                    <TableCell>Discount</TableCell>
                    <TableCell align="right">-{formatPrice(totals.discount)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>Delivery fee</TableCell>
                  <TableCell align="right">{formatPrice(totals.deliveryFee)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total to collect</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatPrice(totals.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
        <Button onClick={() => navigate('/orders')} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={createMutation.isPending}
          startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Add order
        </Button>
      </Stack>
    </Stack>
  )
}

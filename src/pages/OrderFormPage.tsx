import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveIcon from '@mui/icons-material/Remove'
import StickyActions from '@/components/phone/StickyActions'
import { useIsPhone } from '@/hooks/useIsPhone'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { DELIVERY_AREA_LABELS, areaForDistrict } from '@/utils/deliveryArea'
import { formatPrice } from '@/utils/format'
import { MANUAL_SOURCES, SOURCE_LABELS, previewTotals } from '@/utils/orderSource'
import { lineAvailability } from '@/utils/preorder'
import type { DeliveryArea, ManualOrderSource, Product } from '@/types'

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
// quantities and the district; the API prices them from the database and
// charges the area's fee (unless the admin agreed another), so the total shown
// here is a preview and the saved order is what the API answers.
export default function OrderFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const isPhone = useIsPhone()

  const [lines, setLines] = useState<Line[]>([])
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState<ManualOrderSource | ''>('')
  // The district decides the area, except Dhaka, which can be the city or the suburbs
  const [district, setDistrict] = useState('')
  const [area, setArea] = useState<DeliveryArea | ''>('')
  // null until the admin types a fee: then the chosen area's fee applies
  const [deliveryFeeText, setDeliveryFeeText] = useState<string | null>(null)
  const [discountText, setDiscountText] = useState('')
  const [error, setError] = useState('')

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  })
  // Same query as the order edit form, so the two share the cached fees and districts
  const { data: deliveryOptions } = useQuery({
    queryKey: ['delivery-options'],
    queryFn: ordersApi.getDeliveryOptions,
    staleTime: 60_000,
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
  const stepQuantity = (line: Line, change: number) =>
    setQuantity(line.product._id, String(Math.min(Math.max((Number(line.quantity) || 0) + change, 1), MAX_QUANTITY)))
  const removeLine = (id: string) => setLines((current) => current.filter((l) => l.product._id !== id))

  const changeDistrict = (value: string) => {
    setDistrict(value)
    setArea(areaForDistrict(value))
  }

  // The fee the API charges for the chosen area; unknown until a district is picked
  const areaFee = area && deliveryOptions ? deliveryOptions.zones[area] : undefined
  const feeOverridden = deliveryFeeText !== null
  const feeText = deliveryFeeText ?? (areaFee === undefined ? '' : String(areaFee))
  const deliveryFee = toWholeTaka(feeText)
  const feeKnown = feeOverridden || areaFee !== undefined
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
      ((!district || !area) && 'Choose the district the parcel goes to') ||
      (!source && 'Choose where the order came from') ||
      (deliveryFee === null && 'Delivery fee must be a whole number of taka, 0 or more') ||
      (discount === null && 'Discount must be a whole number of taka, 0 or more') ||
      ((discount ?? 0) > totals.subtotal && "Discount can't be more than the sarees' subtotal")

    if (problem || !source || !area) {
      setError(problem || 'Fill in the order details')
      return
    }

    createMutation.mutate({
      customerName: customerName.trim(),
      phone,
      address: address.trim(),
      district,
      deliveryArea: area,
      ...(notes.trim() && { notes: notes.trim() }),
      source,
      items,
      // Only sent when changed, so the API charges its current fee for the area otherwise
      ...(feeOverridden && { deliveryFeeOverride: deliveryFee ?? 0 }),
      ...(discount ? { discount } : {}),
    })
  }

  return (
    <Stack spacing={isPhone ? 2 : 3} component="form" onSubmit={handleSubmit} noValidate>
      {!isPhone && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/orders')} aria-label="Back to orders">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Add order</Typography>
        </Stack>
      )}

      <Typography color="text.secondary" variant={isPhone ? 'body2' : 'body1'}>
        For orders taken by Facebook, WhatsApp or phone. Prices come from the shop's product list. The order
        starts as Pending; stock is taken when you confirm it, the same as a website order.
      </Typography>

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
                  <Stack direction={isPhone ? 'column' : 'row'} sx={{ justifyContent: 'space-between', width: '100%', gap: isPhone ? 0 : 2 }}>
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
              <Stack spacing={1}>
                {lines.map((line) => {
                  const quantity = Number(line.quantity) || 0
                  const availability = lineAvailability(line.product, quantity)
                  return (
                    <Paper key={line.product._id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Typography sx={{ fontWeight: 500 }}>{line.product.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{formatPrice(line.product.price)} each</Typography>
                          {availability === 'preorder' && (
                            <Chip
                              size="small"
                              color="info"
                              variant="outlined"
                              label={`Pre-order, about ${line.product.preorderDays ?? 15} days`}
                              sx={{ mt: 0.5 }}
                            />
                          )}
                          {availability === 'short' && (
                            <Chip size="small" color="error" label={`Only ${line.product.stock} left`} sx={{ mt: 0.5 }} />
                          )}
                        </div>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeLine(line.product._id)} aria-label={`Remove ${line.product.name}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <IconButton onClick={() => stepQuantity(line, -1)} aria-label={`One less ${line.product.name}`} sx={{ border: 1, borderColor: 'divider' }}>
                            <RemoveIcon />
                          </IconButton>
                          <TextField
                            size="small"
                            value={line.quantity}
                            onChange={(e) => setQuantity(line.product._id, e.target.value)}
                            sx={{ width: 64 }}
                            slotProps={{ htmlInput: { inputMode: 'numeric', style: { textAlign: 'center' }, 'aria-label': `${line.product.name} quantity` } }}
                          />
                          <IconButton onClick={() => stepQuantity(line, 1)} aria-label={`One more ${line.product.name}`} sx={{ border: 1, borderColor: 'divider' }}>
                            <AddIcon />
                          </IconButton>
                        </Stack>
                        <Typography sx={{ fontWeight: 700 }}>{formatPrice(line.product.price * quantity)}</Typography>
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
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
                type="tel"
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
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
              <TextField
                select
                label="District"
                required
                value={district}
                onChange={(e) => changeDistrict(e.target.value)}
                disabled={!deliveryOptions}
                sx={{ minWidth: { md: 240 } }}
                helperText={area ? `${DELIVERY_AREA_LABELS[area]} delivery` : 'Sets the delivery fee'}
              >
                {(deliveryOptions?.districts ?? []).map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
              {district === 'Dhaka' && (
                <RadioGroup
                  row
                  value={area}
                  onChange={(e) => setArea(e.target.value as DeliveryArea)}
                  aria-label="Dhaka city or suburbs"
                >
                  <FormControlLabel value="inside_dhaka" control={<Radio />} label="Dhaka city" />
                  <FormControlLabel value="outside_dhaka" control={<Radio />} label="Dhaka suburbs" />
                </RadioGroup>
              )}
            </Stack>
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
                helperText={
                  area && areaFee !== undefined
                    ? `${DELIVERY_AREA_LABELS[area]} fee is ${formatPrice(areaFee)}`
                    : 'Choose the district to see the fee'
                }
                slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
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
                  <TableCell align="right">{feeKnown ? formatPrice(totals.deliveryFee) : 'Choose district'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total to collect</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatPrice(totals.total)}
                    {!feeKnown && ' + delivery'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Stack>
        </CardContent>
      </Card>

      <StickyActions error={error} onCloseError={() => setError('')}>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          {isPhone ? (
            <Stack sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Total to collect</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.2 }}>
                {formatPrice(totals.total)}
                {!feeKnown && ' + delivery'}
              </Typography>
            </Stack>
          ) : (
            <Button onClick={() => navigate('/orders')} disabled={createMutation.isPending}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
            startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Add order
          </Button>
        </Stack>
      </StickyActions>
    </Stack>
  )
}

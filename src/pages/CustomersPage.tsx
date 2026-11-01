import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
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
import CloseIcon from '@mui/icons-material/Close'
import { customersApi, type CustomerQuery } from '@/api/customers'
import ChipRow from '@/components/phone/ChipRow'
import ContactButtons from '@/components/phone/ContactButtons'
import PageHeader from '@/components/phone/PageHeader'
import Pager from '@/components/phone/Pager'
import { useIsPhone } from '@/hooks/useIsPhone'
import CustomerSummary from '@/components/CustomerSummary'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAccess } from '@/hooks/useMe'
import type { Customer, CustomerSort } from '@/types'
import { blockLabel } from '@/utils/customers'
import { formatDate, formatPrice } from '@/utils/format'
import { statusColor } from '@/utils/orderStatus'

const PAGE_SIZES = [25, 50, 100]

const SORT_LABELS: Record<CustomerSort, string> = {
  recent: 'Latest order first',
  orders: 'Most orders first',
  refused: 'Most refused or cancelled first',
}

// The phone's filter row: one tap per way of looking at the list
type PhoneView = CustomerSort | 'blocked'
const PHONE_VIEWS: { value: PhoneView; label: string }[] = [
  { value: 'recent', label: 'Latest' },
  { value: 'orders', label: 'Most orders' },
  { value: 'refused', label: 'Most refused' },
  { value: 'blocked', label: 'Blocked' },
]

// One phone's history: summary, block button and its latest orders
function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const isPhone = useIsPhone()
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'one', customer?.phone],
    queryFn: () => customersApi.get(customer!.phone),
    enabled: Boolean(customer),
  })

  return (
    <Dialog open={Boolean(customer)} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isPhone}>
      <DialogTitle sx={isPhone ? { display: 'flex', alignItems: 'center', gap: 0.5, pl: 1, pr: 2 } : undefined}>
        {isPhone && (
          <IconButton onClick={onClose} aria-label="Close customer">
            <CloseIcon />
          </IconButton>
        )}
        <Box component="span" sx={{ minWidth: 0 }}>
          {customer?.name || 'Customer'} · {customer?.phone}
        </Box>
      </DialogTitle>
      <DialogContent>
        {customer && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isPhone && (
              <Stack direction="row" spacing={1}>
                <ContactButtons phone={customer.phone} name={customer.name} />
              </Stack>
            )}
            <CustomerSummary phone={customer.phone} linkToList={false} />
            <Typography variant="body2" color="text.secondary">
              {customer.address}
              {customer.district ? `, ${customer.district}` : ''}
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={120} />
            ) : isPhone ? (
              <Stack divider={<Divider />} spacing={1}>
                {data?.orders.map((order) => (
                  <Stack key={order._id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>{order.orderNumber}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.createdAt)}, {formatPrice(order.total)}
                      </Typography>
                    </Stack>
                    <Chip size="small" label={order.status} color={statusColor[order.status]} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={order.status} color={statusColor[order.status]} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Customers are phone numbers: everyone who has ordered, with how their orders went.
// Blocked numbers still order; their orders are marked in red on the Orders page.
export default function CustomersPage() {
  const { can } = useAccess()
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') ?? '')
  const [sort, setSort] = useState<CustomerSort>('recent')
  const [blockedOnly, setBlockedOnly] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)

  const search = useDebouncedValue(searchTerm.trim())
  const query: CustomerQuery = {
    ...(search && { search }),
    sort,
    ...(blockedOnly && { blocked: 'true' as const }),
  }

  // Changing the search or filters goes back to the first page
  const queryKey = JSON.stringify(query)
  const [paging, setPaging] = useState({ queryKey, page: 0 })
  const page = paging.queryKey === queryKey ? paging.page : 0
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', 'page', query, page, pageSize],
    queryFn: () => customersApi.getPage(query, page + 1, pageSize),
  })
  const total = data?.total ?? 0
  const showMoney = can('money.view')
  const isPhone = useIsPhone()

  return (
    <Stack spacing={isPhone ? 1 : 3}>
      <PageHeader title="Customers" />
      {!isPhone && (
        <Typography variant="body2" color="text.secondary">
          Everyone who has ordered, by phone number. Open a customer to see their orders or block the number.
          Orders from a blocked number still come in, marked in red, so you can call before shipping.
        </Typography>
      )}

      {isPhone ? (
        <>
          <TextField
            placeholder="Phone or name"
            aria-label="Search customers"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
          />
          <ChipRow
            label="Show"
            sticky
            value={blockedOnly ? 'blocked' : sort}
            onChange={(view: PhoneView) => {
              setBlockedOnly(view === 'blocked')
              if (view !== 'blocked') setSort(view)
            }}
            options={PHONE_VIEWS}
          />
        </>
      ) : (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            placeholder="Search by phone or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as CustomerSort)}
            size="small"
            sx={{ minWidth: 240 }}
            inputProps={{ 'aria-label': 'Sort' }}
          >
            {(Object.keys(SORT_LABELS) as CustomerSort[]).map((key) => (
              <MenuItem key={key} value={key}>
                {SORT_LABELS[key]}
              </MenuItem>
            ))}
          </Select>
          <FormControlLabel
            control={<Switch checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} />}
            label="Blocked only"
          />
        </Stack>
      )}

      {isLoading ? (
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </Paper>
      ) : isError ? (
        <Alert severity="error">Could not load customers. Try again in a moment.</Alert>
      ) : isPhone ? (
        <Stack spacing={1.5}>
          <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Stack divider={<Divider />}>
              {data?.customers.map((customer) => (
                <Stack
                  key={customer.phone}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', pr: 1.5, ...(customer.blocked && { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) }) }}
                >
                  <ButtonBase
                    onClick={() => setSelected(customer)}
                    sx={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'left', p: 1.5 }}
                  >
                    <Typography sx={{ fontWeight: 500 }} noWrap>{customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{customer.phone}</Typography>
                    <Typography variant="body2">
                      {customer.orders} order{customer.orders === 1 ? '' : 's'}, {customer.delivered} delivered
                      {customer.returned > 0 && `, ${customer.returned} refused`}
                      {customer.cancelled > 0 && `, ${customer.cancelled} cancelled`}
                    </Typography>
                    {(customer.blocked || customer.risky) && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                        {customer.blocked && <Chip size="small" color="error" label="Blocked" />}
                        {customer.risky && <Chip size="small" color="warning" variant="outlined" label="Risky" />}
                      </Stack>
                    )}
                  </ButtonBase>
                  <ContactButtons phone={customer.phone} name={customer.name} />
                </Stack>
              ))}
              {data?.customers.length === 0 && (
                <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
                  {search || blockedOnly ? 'No customers match.' : 'No customers yet.'}
                </Typography>
              )}
            </Stack>
          </Paper>
          <Pager page={page} pageSize={pageSize} total={total} onChange={(next) => setPaging({ queryKey, page: next })} />
        </Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Orders</TableCell>
                <TableCell>Delivered</TableCell>
                <TableCell>Refused</TableCell>
                <TableCell>Cancelled</TableCell>
                {showMoney && <TableCell>Spent</TableCell>}
                <TableCell>Last order</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.customers.map((customer) => (
                <TableRow
                  key={customer.phone}
                  hover
                  onClick={() => setSelected(customer)}
                  sx={{ cursor: 'pointer', ...(customer.blocked && { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) }) }}
                >
                  <TableCell>
                    <Typography variant="body1">{customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {customer.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell>{customer.delivered}</TableCell>
                  <TableCell>{customer.returned}</TableCell>
                  <TableCell>{customer.cancelled}</TableCell>
                  {showMoney && <TableCell>{formatPrice(customer.spent ?? 0)}</TableCell>}
                  <TableCell>{formatDate(customer.lastOrderAt)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {customer.blocked && (
                        <Tooltip title={blockLabel(customer.blocked.note)}>
                          <Chip size="small" color="error" label="Blocked" />
                        </Tooltip>
                      )}
                      {customer.risky && <Chip size="small" color="warning" variant="outlined" label="Risky" />}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {data?.customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showMoney ? 8 : 7}>
                    <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                      {search || blockedOnly ? 'No customers match.' : 'No customers yet.'}
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
      )}

      <CustomerDialog customer={selected} onClose={() => setSelected(null)} />
    </Stack>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
import { customersApi, type CustomerQuery } from '@/api/customers'
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

// One phone's history: summary, block button and its latest orders
function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'one', customer?.phone],
    queryFn: () => customersApi.get(customer!.phone),
    enabled: Boolean(customer),
  })

  return (
    <Dialog open={Boolean(customer)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {customer?.name || 'Customer'} · {customer?.phone}
      </DialogTitle>
      <DialogContent>
        {customer && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <CustomerSummary phone={customer.phone} linkToList={false} />
            <Typography variant="body2" color="text.secondary">
              {customer.address}
              {customer.district ? `, ${customer.district}` : ''}
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={120} />
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

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Customers</Typography>
      <Typography variant="body2" color="text.secondary">
        Everyone who has ordered, by phone number. Open a customer to see their orders or block the number.
        Orders from a blocked number still come in, marked in red, so you can call before shipping.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
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

      {isLoading ? (
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </Paper>
      ) : isError ? (
        <Alert severity="error">Could not load customers. Try again in a moment.</Alert>
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

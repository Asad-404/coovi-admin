import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import RevenueChart from '@/components/RevenueChart'
import { LOW_STOCK_THRESHOLD } from '@/constants'
import { countByStatus, dailyRevenue, lowStockProducts, revenueOf } from '@/utils/dashboardStats'
import { formatPrice } from '@/utils/format'
import { STATUSES, statusColor } from '@/utils/orderStatus'

const RANGES = [7, 14, 30] as const

interface StatTileProps {
  label: string
  loading: boolean
  value: ReactNode
  hint?: string
  onClick?: () => void
}

function StatTile({ label, loading, value, hint, onClick }: StatTileProps) {
  const content = (
    <CardContent sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      {loading ? <Skeleton variant="text" width={100} height={42} /> : value}
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </CardContent>
  )
  return <Card sx={{ height: '100%' }}>{onClick ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{content}</CardActionArea> : content}</Card>
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<(typeof RANGES)[number]>(14)

  const { data: admin, isLoading: adminLoading, isError: adminError } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  })

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getAll,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
  })

  const allOrders = orders ?? []
  const totalRevenue = revenueOf(allOrders)
  const ordersByStatus = countByStatus(allOrders)
  const lowStockList = lowStockProducts(products ?? [])
  const daily = dailyRevenue(allOrders, range)
  const rangeRevenue = daily.reduce((sum, d) => sum + d.revenue, 0)

  if (adminError) {
    return (
      <Alert severity="error">
        Could not load your admin profile — the API may be down.
      </Alert>
    )
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Dashboard</Typography>

      {/* Welcome Card */}
      <Card>
        <CardContent>
          {adminLoading ? (
            <Skeleton variant="text" width={220} height={32} />
          ) : (
            <Stack spacing={2}>
              <Typography variant="h6">
                Welcome back{admin ? `, ${admin.name}` : ''} 👋
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={admin?.email ?? ''} />
                <Chip label={admin?.role ?? ''} color="primary" />
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Total Orders"
            loading={ordersLoading}
            value={<Typography variant="h4">{allOrders.length}</Typography>}
            onClick={() => navigate('/orders')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Total Revenue"
            loading={ordersLoading}
            value={<Typography variant="h4">{formatPrice(totalRevenue)}</Typography>}
            hint="Excludes cancelled orders"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Products"
            loading={productsLoading}
            value={<Typography variant="h4">{products?.length ?? 0}</Typography>}
            onClick={() => navigate('/products')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Low Stock"
            loading={productsLoading}
            value={
              <Typography variant="h4" color={lowStockList.length > 0 ? 'error' : 'text.primary'}>
                {lowStockList.length}
              </Typography>
            }
            hint={`Fewer than ${LOW_STOCK_THRESHOLD} left`}
            onClick={() => navigate('/products?stock=low')}
          />
        </Grid>
      </Grid>

      {/* Revenue over time */}
      <Card>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Stack>
              <Typography variant="h6">Revenue, last {range} days</Typography>
              <Typography variant="body2" color="text.secondary">
                {ordersLoading ? '…' : `${formatPrice(rangeRevenue)} · cancelled orders excluded`}
              </Typography>
            </Stack>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={range}
              onChange={(_, value) => value && setRange(value)}
              aria-label="Date range"
            >
              {RANGES.map((r) => (
                <ToggleButton key={r} value={r}>
                  {r}d
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
          {ordersLoading ? <Skeleton variant="rounded" height={180} /> : <RevenueChart data={daily} />}
        </CardContent>
      </Card>

      {/* Low stock list */}
      {lowStockList.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Running low on stock
            </Typography>
            <List dense disablePadding>
              {lowStockList.slice(0, 8).map((product) => (
                <ListItemButton key={product._id} onClick={() => navigate(`/products/${product.slug}/edit`)}>
                  <ListItemText primary={product.name} secondary={product.slug} />
                  <Chip
                    size="small"
                    label={product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                    color={product.stock === 0 ? 'error' : 'warning'}
                  />
                </ListItemButton>
              ))}
            </List>
            {lowStockList.length > 8 && (
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/products?stock=low')}>
                See all {lowStockList.length} low-stock products
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders by Status — each chip opens the Orders page filtered to that status */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Orders by Status
          </Typography>
          {ordersLoading ? (
            <Skeleton variant="text" width={400} height={40} />
          ) : (
            <Stack direction="row" sx={{ flexWrap: 'wrap', mt: 2, gap: 1 }}>
              {STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={`${status}: ${ordersByStatus[status]}`}
                  color={statusColor[status]}
                  onClick={() => navigate(`/orders?status=${status}`)}
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

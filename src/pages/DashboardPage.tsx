import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { formatPrice } from '@/utils/format'

export default function DashboardPage() {
  const { data: admin, isLoading: adminLoading, isError: adminError } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  })

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll(),
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  })

  // Calculate stats
  const totalOrders = orders?.length ?? 0
  const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) ?? 0
  const totalProducts = products?.length ?? 0
  const lowStockProducts = products?.filter(p => p.stock < 6).length ?? 0

  const ordersByStatus = {
    Pending: orders?.filter(o => o.status === 'Pending').length ?? 0,
    Processing: orders?.filter(o => o.status === 'Processing').length ?? 0,
    Shipped: orders?.filter(o => o.status === 'Shipped').length ?? 0,
    Delivered: orders?.filter(o => o.status === 'Delivered').length ?? 0,
    Cancelled: orders?.filter(o => o.status === 'Cancelled').length ?? 0,
  }

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
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Orders
            </Typography>
            {ordersLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4">{totalOrders}</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Revenue
            </Typography>
            {ordersLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4">{formatPrice(totalRevenue)}</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Products
            </Typography>
            {productsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4">{totalProducts}</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Low Stock
            </Typography>
            {productsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color={lowStockProducts > 0 ? 'error' : 'text.primary'}>
                {lowStockProducts}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Orders by Status */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Orders by Status
          </Typography>
          {ordersLoading ? (
            <CircularProgress />
          ) : (
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mt: 2, gap: 1 }}>
              <Chip label={`Pending: ${ordersByStatus.Pending}`} color="warning" />
              <Chip label={`Processing: ${ordersByStatus.Processing}`} color="info" />
              <Chip label={`Shipped: ${ordersByStatus.Shipped}`} color="primary" />
              <Chip label={`Delivered: ${ordersByStatus.Delivered}`} color="success" />
              <Chip label={`Cancelled: ${ordersByStatus.Cancelled}`} color="error" />
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

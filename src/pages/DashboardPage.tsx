import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
  ListItem,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type { ReactElement, ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { productsApi } from '@/api/products'
import { statsApi } from '@/api/stats'
import RevenueChart from '@/components/RevenueChart'
import { useLowStockThreshold } from '@/api/settings'
import {
  RANGE_PRESETS,
  lowStockProducts,
  percent,
  rangeFor,
  rangeProblem,
  type DateRange,
  type RangePreset,
} from '@/utils/dashboardStats'
import { formatPrice } from '@/utils/format'
import { STATUSES, statusColor } from '@/utils/orderStatus'
import { ORDER_SOURCES, SOURCE_LABELS } from '@/utils/orderSource'
import { DELIVERY_AREA_LABELS } from '@/utils/deliveryArea'
import { useAccess } from '@/hooks/useMe'
import { roleLabel } from '@/utils/permissions'

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
      {loading ? <Skeleton variant="text" width={100} height={42} /> : <Typography variant="h4">{value}</Typography>}
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </CardContent>
  )
  return <Card sx={{ height: '100%' }}>{onClick ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{content}</CardActionArea> : content}</Card>
}

// One row of tiles; each tile takes an equal share on wide screens
function TileRow({ title, children }: { title: string; children: ReactElement[] }) {
  const md = 12 / Math.max(Math.min(children.length, 4), 1)
  return (
    <Stack spacing={1}>
      <Typography variant="h6">{title}</Typography>
      <Grid container spacing={3}>
        {children.map((tile) => (
          <Grid key={tile.key} size={{ xs: 12, sm: 6, md }}>
            {tile}
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  // Each part shows only with its permission: money needs money.view
  const { can } = useAccess()
  const canSeeMoney = can('money.view')
  const canSeeOrders = can('orders.view')
  const canSeeProducts = can('products.view')

  const [preset, setPreset] = useState<RangePreset>('30d')
  const [custom, setCustom] = useState<DateRange>(() => rangeFor('30d'))
  const range = preset === 'custom' ? custom : rangeFor(preset)
  const problem = preset === 'custom' ? rangeProblem(custom) : null

  const { data: admin, isLoading: adminLoading, isError: adminError } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  })

  // The numbers are worked out by the API from every order in the range
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['stats', range.from, range.to],
    queryFn: () => statsApi.get(range),
    enabled: canSeeOrders && !problem,
    placeholderData: keepPreviousData,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
    enabled: canSeeProducts,
  })

  const lowStockThreshold = useLowStockThreshold()
  const lowStockList = lowStockProducts(products ?? [], lowStockThreshold)

  if (adminError) {
    return (
      <Alert severity="error">
        Could not load your admin profile — the API may be down.
      </Alert>
    )
  }

  const loading = statsLoading || !stats
  const money = stats?.money
  const orders = stats?.orders
  const delivered = orders?.byStatus.Delivered ?? 0
  const rangeText =
    range.from === range.to ? range.from : `${range.from} to ${range.to}`

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
                <Chip label={admin ? `${roleLabel(admin.role)}${admin.customized ? ' (custom)' : ''}` : ''} color="primary" />
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>

      {canSeeOrders && (
        <>
          {/* What needs doing now, whenever the order was placed */}
          <TileRow title="Needs doing now">
            {[
              <StatTile key="To confirm"
                label="To confirm"
                loading={loading}
                value={stats?.pipeline.toConfirm}
                hint="Pending orders to call and confirm"
                onClick={() => navigate('/orders?status=Pending')}
              />,
              <StatTile key="To ship"
                label="To ship"
                loading={loading}
                value={stats?.pipeline.toShip}
                hint="Confirmed, not handed to the courier"
                onClick={() => navigate('/orders?status=Processing')}
              />,
              <StatTile key="On the way"
                label="On the way"
                loading={loading}
                value={stats?.pipeline.onTheWay}
                hint="With the courier"
                onClick={() => navigate('/orders?status=Shipped')}
              />,
              <StatTile key="Pre-orders waiting"
                label="Pre-orders waiting"
                loading={loading}
                value={stats?.pipeline.preordersWaiting}
                hint="Confirmed orders with a saree being sourced"
                onClick={() => navigate('/orders?status=Processing')}
              />,
            ]}
          </TileRow>

          {/* Date range for everything below */}
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
                <Stack>
                  <Typography variant="h6">Orders placed {preset === 'today' ? 'today' : `from ${rangeText}`}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days are in Bangladesh time. Cancelled and refused orders never count as money.
                  </Typography>
                </Stack>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={preset}
                  onChange={(_, value: RangePreset | null) => {
                    if (!value) return
                    // Custom starts from the range on screen, so it can be adjusted
                    if (value === 'custom') setCustom(range)
                    setPreset(value)
                  }}
                  aria-label="Date range"
                  sx={{ flexWrap: 'wrap' }}
                >
                  {RANGE_PRESETS.map((r) => (
                    <ToggleButton key={r.key} value={r.key}>
                      {r.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
              {preset === 'custom' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={custom.from}
                    onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={custom.to}
                    onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              )}
              {problem && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {problem}
                </Alert>
              )}
              {statsError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Could not load the numbers. Try again in a moment.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Money (needs money.view) */}
          {canSeeMoney && (
            <TileRow title="Money">
              {[
                <StatTile key="Delivered revenue"
                  label="Delivered revenue"
                  loading={loading}
                  value={money && formatPrice(money.deliveredRevenue)}
                  hint={money && `${money.deliveredOrders} delivered, delivery fees included`}
                />,
                <StatTile key="Profit"
                  label="Profit"
                  loading={loading}
                  value={money && (money.profitOrders > 0 ? formatPrice(money.grossProfit) : 'Unknown')}
                  hint={
                    money &&
                    (money.unknownCostOrders > 0
                      ? `${money.unknownCostOrders} delivered order${money.unknownCostOrders === 1 ? '' : 's'} left out: no cost price`
                      : 'Sales minus cost price, before courier charges')
                  }
                />,
                <StatTile key="Average order"
                  label="Average order"
                  loading={loading}
                  value={money && (money.averageOrderValue === null ? '–' : formatPrice(money.averageOrderValue))}
                  hint={money && `All orders not cancelled or refused: ${formatPrice(money.orderValue)}`}
                />,
                <StatTile key="Cash with the courier"
                  label="Cash with the courier"
                  loading={loading}
                  value={money && formatPrice(money.courierOwes.total)}
                  hint={money && `${money.courierOwes.orders} delivered order${money.courierOwes.orders === 1 ? '' : 's'} not paid out yet, any date`}
                  onClick={can('payments.view') ? () => navigate('/courier-payments') : undefined}
                />,
              ]}
            </TileRow>
          )}

          <TileRow title="Orders">
            {[
              <StatTile key="Orders placed" label="Orders placed" loading={loading} value={orders?.total} hint={orders && `${orders.withPreorder} with a pre-order`} />,
              <StatTile key="Delivered" label="Delivered" loading={loading} value={delivered} hint={orders && `${percent(delivered, orders.total)} of orders placed`} />,
              <StatTile key="Refused at the door"
                label="Refused at the door"
                loading={loading}
                value={orders && (orders.refusedRate === null ? '–' : `${Math.round(orders.refusedRate)}%`)}
                hint={orders && `${orders.byStatus.Returned} refused of ${delivered + orders.byStatus.Returned} that reached the customer`}
              />,
              <StatTile key="Cancelled" label="Cancelled" loading={loading} value={orders?.byStatus.Cancelled} hint={orders && `${percent(orders.byStatus.Cancelled, orders.total)} of orders placed`} />,
            ]}
          </TileRow>

          {/* Per day: order value with money access, otherwise order counts */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {canSeeMoney ? 'Order value per day' : 'Orders per day'}
              </Typography>
              {loading ? <Skeleton variant="rounded" height={180} /> : <RevenueChart data={stats.daily} money={canSeeMoney} />}
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Best sellers
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rounded" height={120} />
                  ) : stats.bestSellers.length === 0 ? (
                    <Typography color="text.secondary">No sales in this range.</Typography>
                  ) : (
                    <List dense disablePadding>
                      {stats.bestSellers.map((p) => (
                        <ListItem key={p.productId} disableGutters>
                          <ListItemText primary={p.name} secondary={p.value !== undefined ? formatPrice(p.value) : undefined} />
                          <Chip size="small" label={`${p.quantity} sold`} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Where orders come from
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rounded" height={120} />
                  ) : (
                    <Stack spacing={2}>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {ORDER_SOURCES.filter((s) => (orders?.bySource[s] ?? 0) > 0).map((s) => (
                          <Chip key={s} label={`${SOURCE_LABELS[s]}: ${orders?.bySource[s]}`} />
                        ))}
                        {(['inside_dhaka', 'outside_dhaka'] as const).map((area) => (
                          <Chip key={area} variant="outlined" label={`${DELIVERY_AREA_LABELS[area]}: ${orders?.byArea[area]}`} />
                        ))}
                      </Stack>
                      {stats.topDistricts.length > 0 && (
                        <List dense disablePadding>
                          {stats.topDistricts.map((d) => (
                            <ListItem key={d.district} disableGutters>
                              <ListItemText primary={d.district} />
                              <Chip size="small" label={`${d.orders} order${d.orders === 1 ? '' : 's'}`} />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Orders by status in the range: each chip opens the Orders page filtered to that status */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Orders by status
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={400} height={40} />
              ) : (
                <Stack direction="row" sx={{ flexWrap: 'wrap', mt: 2, gap: 1 }}>
                  {STATUSES.map((status) => (
                    <Chip
                      key={status}
                      label={`${status}: ${orders?.byStatus[status] ?? 0}`}
                      color={statusColor[status]}
                      onClick={() => navigate(`/orders?status=${status}`)}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {canSeeProducts && (
        <TileRow title="Products">
          {[
            <StatTile key="Products"
              label="Products"
              loading={productsLoading}
              value={products?.length ?? 0}
              onClick={() => navigate('/products')}
            />,
            <StatTile key="Low stock"
              label="Low stock"
              loading={productsLoading}
              value={
                <Typography component="span" variant="h4" color={lowStockList.length > 0 ? 'error' : 'text.primary'}>
                  {lowStockList.length}
                </Typography>
              }
              hint={`Fewer than ${lowStockThreshold} left`}
              onClick={() => navigate('/products?stock=low')}
            />,
          ]}
        </TileRow>
      )}

      {/* Low stock list */}
      {canSeeProducts && lowStockList.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Running low on stock
            </Typography>
            <List dense disablePadding>
              {lowStockList.slice(0, 8).map((product) => (
                <ListItemButton
                  key={product._id}
                  onClick={() => navigate(can('products.edit') ? `/products/${product.slug}/edit` : '/products?stock=low')}
                >
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
    </Stack>
  )
}

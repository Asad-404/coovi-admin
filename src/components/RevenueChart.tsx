import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { formatPrice } from '@/utils/format'

const CHART_HEIGHT = 160

export interface ChartDay {
  date: string // yyyy-mm-dd
  orders: number
  value?: number // taka, only for people with money access
}

const dayLabel = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

const ordersText = (n: number): string => `${n} order${n === 1 ? '' : 's'}`

// Single-series bar chart per day: taka when `money` is on, otherwise order counts.
// Hover a day for its numbers.
export default function RevenueChart({ data, money }: { data: ChartDay[]; money: boolean }) {
  const amount = (d: ChartDay): number => (money ? (d.value ?? 0) : d.orders)
  const show = (n: number): string => (money ? formatPrice(n) : ordersText(n))
  const max = Math.max(...data.map(amount), 0)

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Busiest day: {show(max)}
      </Typography>
      <Box
        role="list"
        aria-label={money ? 'Order value per day' : 'Orders per day'}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          height: CHART_HEIGHT,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {data.map((d) => {
          const n = amount(d)
          const height = max > 0 ? Math.max((n / max) * CHART_HEIGHT, n > 0 ? 2 : 0) : 0
          const text = money ? `${formatPrice(n)} · ${ordersText(d.orders)}` : ordersText(d.orders)
          return (
            <Tooltip key={d.date} title={`${dayLabel(d.date)}: ${text}`} placement="top">
              {/* Full-height hit area so short bars are still easy to hover */}
              <Box
                role="listitem"
                aria-label={`${dayLabel(d.date)}: ${text}`}
                sx={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  '&:hover > div': { opacity: 0.8 },
                }}
              >
                <Box
                  sx={{
                    width: '70%',
                    maxWidth: 28,
                    height,
                    bgcolor: 'primary.main',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              </Box>
            </Tooltip>
          )
        })}
      </Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          {data.length > 0 && dayLabel(data[0].date)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data.length > 1 && dayLabel(data[data.length - 1].date)}
        </Typography>
      </Stack>
    </Stack>
  )
}

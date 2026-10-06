import { Box, Stack, Tooltip, Typography } from '@mui/material'
import type { DailyRevenue } from '@/utils/dashboardStats'
import { formatPrice } from '@/utils/format'

const CHART_HEIGHT = 160

const dayLabel = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// Single-series bar chart of revenue per day. Hover a day for its numbers.
export default function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 0)

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Peak day: {formatPrice(max)}
      </Typography>
      <Box
        role="list"
        aria-label="Revenue per day"
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
          const height = max > 0 ? Math.max((d.revenue / max) * CHART_HEIGHT, d.revenue > 0 ? 2 : 0) : 0
          return (
            <Tooltip
              key={d.date}
              title={`${dayLabel(d.date)}: ${formatPrice(d.revenue)} · ${d.orders} order${d.orders === 1 ? '' : 's'}`}
              placement="top"
            >
              {/* Full-height hit area so short bars are still easy to hover */}
              <Box
                role="listitem"
                aria-label={`${dayLabel(d.date)}: ${formatPrice(d.revenue)}, ${d.orders} orders`}
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
          Today
        </Typography>
      </Stack>
    </Stack>
  )
}

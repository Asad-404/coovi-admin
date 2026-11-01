import { Box, Chip } from '@mui/material'
import { TOP_BAR_HEIGHT } from './layout'

interface ChipRowProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  // Stays under the top bar while the list scrolls
  sticky?: boolean
}

// One-tap choices in a row that scrolls sideways, instead of a dropdown
export default function ChipRow<T extends string>({ label, value, options, onChange, sticky }: ChipRowProps<T>) {
  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // Runs to the screen edges, so it is clear there is more to swipe to
        mx: -2,
        px: 2,
        py: 1,
        ...(sticky && { position: 'sticky', top: TOP_BAR_HEIGHT, zIndex: 2, bgcolor: 'background.default' }),
      }}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          color={option.value === value ? 'primary' : 'default'}
          variant={option.value === value ? 'filled' : 'outlined'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          sx={{ flexShrink: 0, height: 36, borderRadius: 18, px: 0.5 }}
        />
      ))}
    </Box>
  )
}

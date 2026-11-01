import type { ReactNode } from 'react'
import { Alert, Box, Stack } from '@mui/material'
import { useIsPhone } from '@/hooks/useIsPhone'
import { SAFE_BOTTOM } from './layout'

// A form's Save button and its error. On a phone they stay on screen at the bottom,
// so a long form never hides the button, or a problem up at the top of the page.
export default function StickyActions({ error, onCloseError, children }: { error?: string; onCloseError?: () => void; children: ReactNode }) {
  const isPhone = useIsPhone()
  return (
    <Box
      sx={
        isPhone
          ? {
              position: 'sticky',
              bottom: 0,
              zIndex: 2,
              mx: -2,
              px: 2,
              pt: 1.5,
              pb: `calc(12px + ${SAFE_BOTTOM})`,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
            }
          : undefined
      }
    >
      <Stack spacing={1.5}>
        {error && <Alert severity="error" onClose={onCloseError}>{error}</Alert>}
        {children}
      </Stack>
    </Box>
  )
}

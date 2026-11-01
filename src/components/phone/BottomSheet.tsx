import type { ReactNode } from 'react'
import { Box, Drawer, Stack, Typography } from '@mui/material'
import { SAFE_BOTTOM } from './layout'

interface BottomSheetProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

// Slides up from the bottom edge, within reach of a thumb
export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: '20px 20px 0 0', maxHeight: '88dvh' } } }}
    >
      <Stack spacing={2} sx={{ p: 2, pb: `calc(16px + ${SAFE_BOTTOM})` }}>
        <Box aria-hidden sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', alignSelf: 'center' }} />
        {title && <Typography variant="h6">{title}</Typography>}
        {children}
      </Stack>
    </Drawer>
  )
}

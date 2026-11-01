import type { ReactNode } from 'react'
import { Stack, Typography } from '@mui/material'
import { useIsPhone } from '@/hooks/useIsPhone'

// The page title and its buttons on wide screens. On a phone the top bar carries
// the title and the page shows its main button as a floating one instead.
export default function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  const isPhone = useIsPhone()
  if (isPhone) return null
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Typography variant="h4">{title}</Typography>
      {children && <Stack direction="row" spacing={1}>{children}</Stack>}
    </Stack>
  )
}

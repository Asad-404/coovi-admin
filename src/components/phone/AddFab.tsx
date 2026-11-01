import type { ReactNode } from 'react'
import { Button } from '@mui/material'
import { TOP_BAR_HEIGHT } from './layout'

// The page's main button, in the top bar. Floating over the list it would hide
// the Confirm button on whichever order card sat underneath it.
export default function AddFab({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Button
      variant="contained"
      color="secondary"
      startIcon={icon}
      onClick={onClick}
      sx={{
        position: 'fixed',
        right: 12,
        top: (TOP_BAR_HEIGHT - 44) / 2,
        zIndex: (theme) => theme.zIndex.appBar + 1,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: 'none',
      }}
    >
      {label}
    </Button>
  )
}

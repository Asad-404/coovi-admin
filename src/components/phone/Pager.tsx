import { Button, Stack, Typography } from '@mui/material'

interface PagerProps {
  page: number // from 0
  pageSize: number
  total: number
  onChange: (page: number) => void
}

// Previous and Next for a card list; goes back to the top so the new page starts at its first card
export default function Pager({ page, pageSize, total, onChange }: PagerProps) {
  if (total <= pageSize) return null
  const go = (next: number) => {
    onChange(next)
    window.scrollTo({ top: 0 })
  }
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Button disabled={page === 0} onClick={() => go(page - 1)}>Previous</Button>
      <Typography variant="body2" color="text.secondary">
        {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
      </Typography>
      <Button disabled={(page + 1) * pageSize >= total} onClick={() => go(page + 1)}>Next</Button>
    </Stack>
  )
}

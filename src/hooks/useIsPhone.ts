import { useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Phones and small tablets get the card layout; wider screens keep the tables.
// noSsr: this app only renders in the browser, so the first paint is already right.
export const useIsPhone = (): boolean => {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('md'), { noSsr: true })
}

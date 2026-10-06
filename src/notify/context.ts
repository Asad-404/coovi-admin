import { createContext, useContext } from 'react'
import type { AlertColor } from '@mui/material'

export type Notify = (message: string, severity?: AlertColor) => void

export const NotifyContext = createContext<Notify>(() => {})

// Shows a short toast at the bottom of the screen, e.g. notify('Product saved')
export const useNotify = (): Notify => useContext(NotifyContext)

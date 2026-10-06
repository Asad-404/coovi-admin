import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Snackbar } from '@mui/material'
import type { AlertColor } from '@mui/material'
import { NotifyContext } from './context'

interface Toast {
  key: number
  message: string
  severity: AlertColor
}

export default function NotifyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    setToast({ key: Date.now(), message, severity })
  }, [])

  const close = () => setToast(null)

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={toast?.key}
        open={toast !== null}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={close} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  )
}

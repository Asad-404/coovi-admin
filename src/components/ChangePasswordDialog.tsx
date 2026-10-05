import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { authApi } from '@/api/auth'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setDone(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => setDone(true),
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const details: string[] | undefined = err.response?.data?.errors
        setError(details?.join(', ') ?? err.response?.data?.message ?? 'Could not change the password')
      } else {
        setError('Could not change the password — is the API running?')
      }
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('The new password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Your password was changed. Use the new one next time you sign in.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              helperText="At least 8 characters"
              required
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{done ? 'Close' : 'Cancel'}</Button>
        {!done && (
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
            startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Change password
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

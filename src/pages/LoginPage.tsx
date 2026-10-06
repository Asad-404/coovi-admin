import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { hasUsableToken, setToken } from '@/utils/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { token } = await authApi.login(email, password)
      setToken(token)
      // Start the session with an empty cache, never another admin's data
      queryClient.clear()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  if (hasUsableToken()) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Coovi Admin
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to manage your store
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@coovi.com"
                required
                fullWidth
                autoComplete="email"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}

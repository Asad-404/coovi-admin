import { useQuery } from '@tanstack/react-query'
import { Alert, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material'
import { authApi } from '@/api/auth'

// First React Query usage: fetches GET /auth/me with the stored token,
// caches it, and re-renders when the data arrives.
export default function DashboardPage() {
  const { data: admin, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  })

  if (isError) {
    return (
      <Alert severity="error">
        Could not load your admin profile — the API may be down.
      </Alert>
    )
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Dashboard</Typography>

      <Card>
        <CardContent>
          {isLoading ? (
            <Skeleton variant="text" width={220} height={32} />
          ) : (
            <Stack spacing={2}>
              <Typography variant="h6">
                Welcome back{admin ? `, ${admin.name}` : ''} 👋
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={admin?.email ?? ''} />
                <Chip label={admin?.role ?? ''} color="primary" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                You are signed in with a valid JWT. Product and order management
                are coming in the next steps.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

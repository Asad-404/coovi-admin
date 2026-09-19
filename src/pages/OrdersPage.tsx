import { Card, CardContent, Stack, Typography } from '@mui/material'

export default function OrdersPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Orders</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Order management (list, status updates) is coming after products.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}

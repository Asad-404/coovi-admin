import { Card, CardContent, Stack, Typography } from '@mui/material'

export default function ProductsPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Products</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Product management (list, add, edit, delete) is the next step.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}

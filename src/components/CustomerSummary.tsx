import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Button, Skeleton, Stack } from '@mui/material'
import { customersApi } from '@/api/customers'
import BlockPhoneDialog from '@/components/BlockPhoneDialog'
import { useAccess } from '@/hooks/useMe'
import { blockLabel, customerSummary } from '@/utils/customers'
import { formatPrice } from '@/utils/format'

// Everything this phone has ordered, in one line: red when blocked, orange when
// it has refused or cancelled twice or more. Shown in the order window so the
// person confirming the order can see the history before shipping.
export default function CustomerSummary({ phone, linkToList = true }: { phone: string; linkToList?: boolean }) {
  const { can } = useAccess()
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', 'one', phone],
    queryFn: () => customersApi.get(phone),
  })

  if (isLoading) return <Skeleton variant="rounded" height={48} />
  if (isError || !data) return null

  const { customer } = data
  const severity = customer.blocked ? 'error' : customer.risky ? 'warning' : 'info'
  const spent = customer.spent !== undefined && customer.delivered > 0 ? `, ${formatPrice(customer.spent)} delivered` : ''

  return (
    <>
      <Alert
        severity={severity}
        action={
          <Stack direction="row" spacing={1}>
            {linkToList && (
              <Button color="inherit" size="small" component={RouterLink} to={`/customers?search=${phone}`}>
                Orders
              </Button>
            )}
            {can('orders.edit') && (
              <Button color="inherit" size="small" onClick={() => setDialogOpen(true)}>
                {customer.blocked ? 'Unblock' : 'Block'}
              </Button>
            )}
          </Stack>
        }
      >
        {customer.blocked && (
          <strong>
            {blockLabel(customer.blocked.note)}. Call before shipping.
            <br />
          </strong>
        )}
        This number: {customerSummary(customer)}
        {spent}
        {customer.risky && !customer.blocked && '. Refused or cancelled more than once.'}
      </Alert>
      <BlockPhoneDialog
        phone={phone}
        name={customer.name}
        blocked={Boolean(customer.blocked)}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}

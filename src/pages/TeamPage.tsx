import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { adminsApi } from '@/api/admins'
import type { TeamMemberUpdate } from '@/api/admins'
import { getErrorMessage } from '@/api/errors'
import { useNotify } from '@/notify/context'
import { getTokenAdminId } from '@/utils/auth'
import type { Admin, AdminRole } from '@/types'

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Owner: everything',
  staff: 'Staff: orders and products only',
}

const MIN_PASSWORD = 8

function AddMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('staff')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setName('')
    setEmail('')
    setRole('staff')
    setPassword('')
    setError('')
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => adminsApi.create({ name: name.trim(), email: email.trim(), role, password }),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      notify(`${member.name} added. Give them the temporary password and ask them to change it.`)
      close()
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not add the team member')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(`The temporary password must be at least ${MIN_PASSWORD} characters`)
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle>Add team member</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
          />
          <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            <MenuItem value="staff">{ROLE_LABELS.staff}</MenuItem>
            <MenuItem value="owner">{ROLE_LABELS.owner}</MenuItem>
          </TextField>
          <TextField
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Tell them in person or by phone. They change it with the Password button after signing in."
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={mutation.isPending}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ResetPasswordDialog({ member, onClose }: { member: Admin | null; onClose: () => void }) {
  const notify = useNotify()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setPassword('')
    setError('')
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => adminsApi.resetPassword(member!._id, password),
    onSuccess: () => {
      notify(`New password set for ${member?.name}. They have been signed out everywhere.`)
      close()
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not reset the password')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(`The temporary password must be at least ${MIN_PASSWORD} characters`)
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={member !== null} onClose={close} maxWidth="xs" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle>Reset password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <DialogContentText>
            {member?.name} ({member?.email}) is signed out everywhere and signs in with this temporary password.
          </DialogContentText>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={mutation.isPending}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : 'Set password'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function TeamPage() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const myId = getTokenAdminId()
  const [addOpen, setAddOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<Admin | null>(null)
  const [error, setError] = useState('')

  const { data: team, isLoading, isError } = useQuery({ queryKey: ['admins'], queryFn: adminsApi.list })

  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: TeamMemberUpdate }) => adminsApi.update(id, changes),
    onSuccess: (member) => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      notify(`${member.name} updated`)
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not update the team member')),
  })

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Team</Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAddOpen(true)}>
          Add team member
        </Button>
      </Stack>

      <Typography color="text.secondary">
        Staff can work on orders and products. Only owners see money, settings, this page, CSV export and product
        delete. Changing someone&apos;s role or switching them off signs them out at once.
      </Typography>

      {isError && <Alert severity="error">Could not load the team. The API may be down.</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {isLoading && <Skeleton variant="rounded" height={160} />}

      {team && (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {team.map((member) => {
                  const isMe = member._id === myId
                  const role: AdminRole = member.role === 'staff' ? 'staff' : 'owner'
                  const active = member.active !== false
                  return (
                    <TableRow key={member._id} hover>
                      <TableCell>
                        {member.name}
                        {isMe && <Chip size="small" label="You" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={role}
                          disabled={update.isPending}
                          onChange={(e) =>
                            update.mutate({ id: member._id, changes: { role: e.target.value as AdminRole } })
                          }
                          slotProps={{ htmlInput: { 'aria-label': `Role of ${member.name}` } }}
                        >
                          <MenuItem value="owner">Owner</MenuItem>
                          <MenuItem value="staff">Staff</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={active ? 'success' : 'default'} label={active ? 'Active' : 'Switched off'} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          {!isMe && (
                            <Button size="small" onClick={() => setResetTarget(member)}>
                              Reset password
                            </Button>
                          )}
                          <Button
                            size="small"
                            color={active ? 'error' : 'primary'}
                            disabled={update.isPending}
                            onClick={() => update.mutate({ id: member._id, changes: { active: !active } })}
                          >
                            {active ? 'Switch off' : 'Switch on'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <ResetPasswordDialog member={resetTarget} onClose={() => setResetTarget(null)} />
    </Stack>
  )
}

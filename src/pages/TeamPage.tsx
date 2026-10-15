import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
import { useAccess } from '@/hooks/useMe'
import {
  ACCESS_ROWS,
  ROLES,
  ROLE_HINTS,
  ROLE_LABELS,
  isOwnerRole,
  presetFor,
  roleLabel,
  sameAsPreset,
  togglePermission,
} from '@/utils/permissions'
import type { Permission } from '@/utils/permissions'
import type { Admin, AdminRole } from '@/types'

function RoleSelect({ value, onChange }: { value: AdminRole; onChange: (role: AdminRole) => void }) {
  return (
    <TextField select label="Role" value={value} onChange={(e) => onChange(e.target.value as AdminRole)}>
      {ROLES.map((role) => (
        <MenuItem key={role} value={role}>
          {ROLE_LABELS[role]}: {ROLE_HINTS[role]}
        </MenuItem>
      ))}
    </TextField>
  )
}

// The View and Edit ticks for one person. Picking a role fills them from its preset;
// the owner can then tick or untick boxes for this person only.
function AccessDialog({ member, onClose }: { member: Admin | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const startRole: AdminRole = member && !isOwnerRole(member.role) ? (member.role as AdminRole) : 'owner'
  const [role, setRole] = useState<AdminRole>(startRole)
  const [permissions, setPermissions] = useState<Permission[]>(member?.permissions ?? presetFor(startRole))
  const [error, setError] = useState('')

  const owner = role === 'owner'
  const custom = !owner && !sameAsPreset(role, permissions)

  const mutation = useMutation({
    // Matching the role's preset is saved as just the role, so it stays "not custom"
    mutationFn: () =>
      adminsApi.update(member!._id, owner || !custom ? { role } : { role, permissions }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      notify(`Access saved for ${updated.name}. It applies on their next click.`)
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the access')),
  })

  const pickRole = (next: AdminRole) => {
    setRole(next)
    setPermissions(presetFor(next))
  }

  const box = (permission: Permission | undefined, label: string) =>
    permission ? (
      <Checkbox
        checked={owner || permissions.includes(permission)}
        disabled={owner}
        onChange={() => setPermissions((current) => togglePermission(current, permission))}
        slotProps={{ input: { 'aria-label': label } }}
      />
    ) : null

  return (
    <Dialog open={member !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Access for {member?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <RoleSelect value={role} onChange={pickRole} />
          {owner ? (
            <Alert severity="info">Owners can do everything, including managing the team.</Alert>
          ) : (
            <DialogContentText>
              Ticking Edit also ticks View. {custom ? 'These ticks differ from the role, so this person shows as custom.' : ''}
            </DialogContentText>
          )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Area</TableCell>
                  <TableCell align="center">View</TableCell>
                  <TableCell align="center">Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ACCESS_ROWS.map((row) => (
                  <TableRow key={row.area}>
                    <TableCell>
                      {row.area}
                      {row.editLabel && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          Edit: {row.editLabel}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{box(row.view, `View ${row.area}`)}</TableCell>
                    <TableCell align="center">{box(row.edit, `Edit ${row.area}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions>
        {custom && <Button onClick={() => setPermissions(presetFor(role))}>Reset to role</Button>}
        <Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
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
      notify(`${member.name} added. Give them the temporary password; use Access to adjust what they can do.`)
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
          <RoleSelect value={role} onChange={setRole} />
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
  const myId = useAccess().me?._id
  const [addOpen, setAddOpen] = useState(false)
  const [accessTarget, setAccessTarget] = useState<Admin | null>(null)
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
        Each person has a role, and you can adjust what they can see and change with Access. Changes apply on their
        next click. Switching someone off signs them out at once. Only owners manage the team.
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
                  const active = member.active !== false
                  return (
                    <TableRow key={member._id} hover>
                      <TableCell>
                        {member.name}
                        {isMe && <Chip size="small" label="You" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {roleLabel(member.role)}
                        {member.customized && <Chip size="small" variant="outlined" label="Custom" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={active ? 'success' : 'default'} label={active ? 'Active' : 'Switched off'} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" onClick={() => setAccessTarget(member)}>
                            Access
                          </Button>
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
      {/* key: start each opening from that person's saved access */}
      <AccessDialog key={accessTarget?._id ?? 'closed'} member={accessTarget} onClose={() => setAccessTarget(null)} />
    </Stack>
  )
}

// Mirrors coovi-api src/permissions.ts so the Team page can show and tick the
// access grid. The API is what enforces every permission; this only decides
// which pages and buttons to show.
export const PERMISSIONS = [
  'orders.view',
  'orders.edit',
  'orders.export',
  'products.view',
  'products.edit',
  'products.delete',
  'money.view',
  'payments.view',
  'payments.edit',
  'settings.view',
  'settings.edit',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const ROLES = ['owner', 'manager', 'staff', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
}

export const ROLE_HINTS: Record<Role, string> = {
  owner: 'Everything, including the team',
  manager: 'Orders, products, money and courier payments',
  staff: 'Orders and products, view and edit',
  viewer: 'Orders and products, view only',
}

export const ROLE_PRESETS: Record<Exclude<Role, 'owner'>, readonly Permission[]> = {
  manager: [
    'orders.view',
    'orders.edit',
    'orders.export',
    'products.view',
    'products.edit',
    'products.delete',
    'money.view',
    'payments.view',
    'payments.edit',
  ],
  staff: ['orders.view', 'orders.edit', 'products.view', 'products.edit'],
  viewer: ['orders.view', 'products.view'],
}

// The grid on the Team page: one row per area, with its View and Edit permission
export const ACCESS_ROWS: { area: string; view?: Permission; edit?: Permission; editLabel?: string }[] = [
  { area: 'Orders', view: 'orders.view', edit: 'orders.edit', editLabel: 'status, details, notes, new orders' },
  { area: 'Export orders as CSV', edit: 'orders.export' },
  { area: 'Products and stock', view: 'products.view', edit: 'products.edit', editLabel: 'add and edit' },
  { area: 'Delete products', edit: 'products.delete' },
  { area: 'Revenue and profit', view: 'money.view' },
  { area: 'Courier payments', view: 'payments.view', edit: 'payments.edit' },
  { area: 'Settings', view: 'settings.view', edit: 'settings.edit' },
]

// You can't edit what you can't see
const NEEDS: Partial<Record<Permission, Permission>> = {
  'orders.edit': 'orders.view',
  'orders.export': 'orders.view',
  'products.edit': 'products.view',
  'products.delete': 'products.view',
  // Revenue is worked out from the order list for now, so it needs the orders
  'money.view': 'orders.view',
  'payments.edit': 'payments.view',
  'settings.edit': 'settings.view',
}

export const isOwnerRole = (role: string | undefined): boolean => role === 'owner' || role === 'admin'

export const normalizePermissions = (permissions: readonly Permission[]): Permission[] => {
  const set = new Set<Permission>(permissions)
  for (const permission of permissions) {
    const needed = NEEDS[permission]
    if (needed) set.add(needed)
  }
  return PERMISSIONS.filter((permission) => set.has(permission))
}

export const presetFor = (role: string): Permission[] =>
  isOwnerRole(role) ? [...PERMISSIONS] : normalizePermissions(ROLE_PRESETS[role as Exclude<Role, 'owner'>] ?? [])

// Ticking a box adds what it needs; unticking a View also unticks the Edits that need it
export const togglePermission = (permissions: readonly Permission[], permission: Permission): Permission[] => {
  if (!permissions.includes(permission)) return normalizePermissions([...permissions, permission])
  return permissions.filter((p) => p !== permission && NEEDS[p] !== permission)
}

export const sameAsPreset = (role: string, permissions: readonly Permission[]): boolean => {
  const preset = presetFor(role)
  const mine = normalizePermissions(permissions)
  return mine.length === preset.length && mine.every((p, i) => p === preset[i])
}

export const roleLabel = (role: string): string => ROLE_LABELS[(isOwnerRole(role) ? 'owner' : role) as Role] ?? role

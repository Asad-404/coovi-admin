import { describe, expect, it } from 'vitest'
import { normalizePermissions, presetFor, roleLabel, sameAsPreset, togglePermission } from './permissions'

describe('permissions', () => {
  it('fills in each role preset, owners get everything', () => {
    expect(presetFor('viewer')).toEqual(['orders.view', 'products.view'])
    expect(presetFor('owner')).toContain('settings.edit')
    expect(presetFor('admin')).toEqual(presetFor('owner'))
    expect(presetFor('unknown')).toEqual([])
  })

  it('adds the View an Edit needs, in a fixed order', () => {
    expect(normalizePermissions(['payments.edit', 'orders.export'])).toEqual([
      'orders.view',
      'orders.export',
      'payments.view',
      'payments.edit',
    ])
  })

  it('ticking an Edit ticks its View; unticking a View unticks its Edits', () => {
    const ticked = togglePermission(['products.view'], 'orders.edit')
    expect(ticked).toEqual(['orders.view', 'orders.edit', 'products.view'])
    expect(togglePermission(ticked, 'orders.view')).toEqual(['products.view'])
    expect(togglePermission(ticked, 'orders.edit')).toEqual(['orders.view', 'products.view'])
  })

  it('knows when someone matches their role', () => {
    expect(sameAsPreset('viewer', ['products.view', 'orders.view'])).toBe(true)
    expect(sameAsPreset('viewer', ['orders.view'])).toBe(false)
  })

  it('names roles, with the old admin role as Owner', () => {
    expect(roleLabel('admin')).toBe('Owner')
    expect(roleLabel('staff')).toBe('Staff')
  })
})

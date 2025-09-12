import { describe, it, expect } from 'vitest'
import { hasRole } from '@/lib/rbac'

describe('RBAC', () => {
  it('allows role in list', () => {
    expect(hasRole('ADMIN' as any, ['ADMIN' as any, 'TRAINER' as any])).toBe(true)
  })
  it('denies role not in list', () => {
    expect(hasRole('EMPLOYEE' as any, ['ADMIN' as any])).toBe(false)
  })
})


import type { Role } from '@prisma/client'

export function hasRole(userRole: Role | undefined | null, roles: Role[]): boolean {
  if (!userRole) return false
  return roles.includes(userRole)
}

export const Roles = {
  ADMIN: 'ADMIN',
  TRAINER: 'TRAINER',
  EMPLOYEE: 'EMPLOYEE',
  VIEWER: 'VIEWER',
} as const


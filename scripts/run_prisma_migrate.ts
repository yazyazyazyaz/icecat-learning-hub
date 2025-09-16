import { spawnSync } from 'node:child_process'

const env = { ...process.env }
if (!env.DIRECT_URL && env.DATABASE_URL) {
  env.DIRECT_URL = env.DATABASE_URL
  console.log('[build] DIRECT_URL not set; falling back to DATABASE_URL for Prisma migrate deploy')
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(npxCmd, ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env })

if (result.status !== 0) {
  process.exit(result.status === null ? 1 : result.status)
}

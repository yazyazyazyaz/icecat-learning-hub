# Icecat Learning Hub

## Setup

```
cp .env.example .env.local
npm i
npm run dev
```

### First run with Postgres

```
cp .env.example .env.local
npm i
npm run db:up
npm run migrate
npm run seed
npm run dev
```

Login-based training hub with lessons, progress, and quizzes. Built with Next.js 14 App Router, Prisma, NextAuth, Tailwind.

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (credentials; OIDC stubs ready)
- MDX for lessons (file-based)
- Vitest + Playwright
- Docker Compose

## Quickstart (local, without Docker)

1) Copy env and install deps

```
cp .env.example .env
npm install
```

2) Start Postgres (Docker) or use your own

```
docker compose up -d postgres
```

3) Migrate and seed

```
npx prisma migrate dev --name init
npm run seed
```

4) Run the app

```
npm run dev
```

Open http://localhost:3000

Demo users: admin@/trainer@/employee@/viewer@ with password `password123`.

## Docker (Postgres)

```
docker compose up -d postgres
```

This starts the local Postgres instance for development. Run the app with `npm run dev`.

## NPM scripts
- `npm run dev` — run Next dev server
- `npm run test` — unit tests (Vitest)
- `npm run e2e` — Playwright tests (requires server running)
- `npm run seed` — seeds DB via prisma/seed.ts
- `npm run typecheck` — TypeScript checks
- `npm run lint` — ESLint

## Notes
- MDX lessons live in `/content`. Frontmatter includes: `title, slug, tags, durationMinutes, trainingSlug, moduleOrder, lessonOrder`.
- Server Actions in `/actions` handle progress, quizzes, and admin tasks.
- Protected routes enforced via `middleware.ts` using NextAuth JWT tokens. Admin area requires ADMIN or TRAINER.
- UI uses minimal primitives. For shadcn/ui, run `npx shadcn-ui@latest init` later and generate components.

## Tests
- Unit tests: scoring logic, RBAC, MDX loader
- E2E tests: sign in + mark lesson done; quiz submit and result

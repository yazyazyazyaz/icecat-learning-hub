# Repo Rules (Icecat Learning Hub)

## Mission
Improve stability, a11y, performance, and developer experience without breaking UX or core components:
- MUST NOT change public props or behavior of:
  - components/WizardClient.tsx
  - components/SubTabs.tsx
  - components/QuizRunner.tsx
- Preserve visual design and Tailwind tokens.

## Golden Rules
1. No secrets in code. Use `.env.local` and keep `.env.example` updated.
2. Every data input validated with Zod at the boundary (server actions, API).
3. After any content write, call `revalidateTag(...)` or `revalidatePath(...)` for affected routes.
4. All new UI must be keyboard accessible and axe‑clean.
5. Keep diffs small. One topic per PR. Add tests.

## Commands
- Dev: `npm i && npm run dev`
- DB: `docker compose up -d postgres && npx prisma migrate dev && npm run seed`
- Lint/Typecheck/Test: `npm run lint && npm run typecheck && npm run test`
- E2E: `npx playwright test`

## Structure (App Router)
- `app/` routes, `lib/` utils, `components/`, `content/` (MDX), `prisma/` schema.
- Cache tags in `lib/tags.ts`.
- Auth in `lib/auth.ts`. RBAC via `middleware.ts`.

## Answering guidance
- Name the rule(s) used at the top of your reply.
- If unclear, propose the smallest safe change and ask before proceeding.


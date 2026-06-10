# Le Kiosque Pédagogique

Anonymous pedagogical support platform for teachers — create tickets, chat with interveners (N1/N2), track resolution.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/kiosque run dev` — run the frontend (Vite, random port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (mounted under `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- Auth: JWT (jsonwebtoken), bcryptjs — two token types: staff (8h) and teacher (30d)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for routes)
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM schema (schools, users, tickets, messages, ticketEvents, etc.)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, tickets, messages, intervener, dashboard, reference, admin)
- `artifacts/api-server/src/lib/jwt.ts` — JWT sign/verify
- `artifacts/api-server/src/lib/password.ts` — password generation (WORD-NN-COLOR format)
- `artifacts/api-server/src/middlewares/authenticate.ts` — JWT middleware + RBAC
- `artifacts/kiosque/src/pages/` — all 13 frontend pages
- `artifacts/kiosque/src/lib/auth.ts` — token storage + useAuth hook

## Architecture decisions

- Anonymous teachers: no PII stored. Ticket identified by number + bcrypt password (format: `WORD1-WORD2-NN-COLOR`).
- JWT stored in `localStorage` as `kiosque_token`. Two payload shapes: `{type:"staff", userId, role}` and `{type:"teacher", ticketId}`.
- N1 sees tickets from their school's pool; N2 sees tickets escalated in their transversal domains (via `user_domains` table).
- RD/PG dashboards are read-only aggregates — they cannot see ticket content (enforced at API level).
- All routes mounted under `/api` in Express; generated client adds `/api` prefix automatically.
- Chat uses polling (5s refetchInterval for messages, 15s for pools) — no WebSockets.

## Product

- **Teachers**: Create anonymous tickets (school + discipline + description) → get ticket number + password → chat with intervener → see resolution/Webex link.
- **N1 (conseillers pédagogiques)**: See pool of new tickets for their school → claim → chat → resolve or escalate to N2.
- **N2 (spécialistes domaines)**: See pool of escalated tickets in their domain(s) → claim → chat → resolve or close with Webex link.
- **RD**: Operational dashboard — total tickets, open tickets, avg pickup time, resolution by level, escalations by domain.
- **PG**: Strategic dashboard — monthly trend, school rankings, top transversal domains (filterable by discipline).
- **Admin**: Manage agents (create/deactivate), schools, disciplines.

## Seeded test accounts (all passwords: `admin1234`)

| Email | Role |
|-------|------|
| admin@kiosque.fr | admin |
| n1.hugo@kiosque.fr | n1 (Lycée Victor Hugo, Mathématiques) |
| n1.moulin@kiosque.fr | n1 (Collège Jean Moulin, Français) |
| n2.inclusion@kiosque.fr | n2 (domains: Inclusion, Harcèlement, Bien-être) |
| n2.numerique@kiosque.fr | n2 (domains: Numérique, Gestion de classe) |
| rd.paris@kiosque.fr | rd |
| pg@kiosque.fr | pg |

## Gotchas

- Run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` after any DB schema change (stale lib declarations cause false positives).
- Orval-generated `UseQueryOptions` requires `queryKey` in TanStack v5 — pass `{ query: {...} as any }` as workaround when adding `refetchInterval` or `enabled`.
- N1 pool only shows tickets with status `new`; N2 pool only shows `escalated` tickets.
- `useGetTicket(id, options)` and `useGetTicketMessages(ticketId, options)` take positional first args, not an object.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

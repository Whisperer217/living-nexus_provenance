# AGENTS.md

## Cursor Cloud specific instructions

Living Nexus is a single-package full-stack app (React 19 client + Express/tRPC server in one process, MySQL via Drizzle ORM). Standard scripts live in `package.json` (`dev`, `build`, `check`, `test`, `db:push`); the README has the quick start. Notes below are the non-obvious things needed to run it in this environment.

### Runtime / package manager
- Node 22 and `pnpm@10` (pinned via `packageManager`). Dependencies are installed by the environment `install` step (`pnpm install`).
- Ignored build scripts (`sharp`, `esbuild`, `@tailwindcss/oxide`) are fine to leave unapproved — dev server, tests, and typecheck all work without them. Do NOT run `pnpm approve-builds` (interactive).

### Local database (required for anything DB-backed)
- The app needs MySQL/MariaDB via `DATABASE_URL`. Without it `getDb()` returns `null` and most routes/UI show empty/errors.
- Start the DB each session (it does not auto-start on boot):
  ```
  sudo mkdir -p /run/mysqld && sudo chown -R mysql:mysql /run/mysqld
  sudo mariadbd --user=mysql --datadir=/var/lib/mysql --bind-address=127.0.0.1 &
  ```
- Local dev DB/creds: database `living_nexus`, user `ln` / password `lnpass`. Connection string: `mysql://ln:lnpass@127.0.0.1:3306/living_nexus`.
- **Schema creation gotcha:** `pnpm db:push` (which runs `drizzle-kit generate && drizzle-kit migrate`) does NOT work on a fresh database — `generate` is interactive and the committed migration history in `drizzle/` assumes a pre-existing production schema. To build the schema on a fresh DB:
  ```
  pnpm exec drizzle-kit push --force
  ```
  On an already-populated DB, `drizzle-kit push` may fail MariaDB introspection (`checkConstraint` undefined). Prefer empty-DB push or committed migrations as source of truth.

### Environment variables (`.env`, gitignored)
The server loads `.env` via `dotenv/config`; Vite reads `VITE_`-prefixed vars at dev-server startup (restart `pnpm dev` after changing them). Minimum needed to run the app in dev:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://ln:lnpass@127.0.0.1:3306/living_nexus
JWT_SECRET=dev-local-jwt-secret-change-me
MCP_READ_TOKEN=dev-local-mcp-read-token
VITE_APP_ID=dev-app-id
VITE_OAUTH_PORTAL_URL=https://oauth.example.com
```
- **Client-crash gotcha:** `VITE_OAUTH_PORTAL_URL` MUST be set to a *valid* URL. `client/src/const.ts` `getLoginUrl()` runs `new URL(...)` during render, so if it is unset every page crashes. Any syntactically valid URL unblocks rendering.
- Real Manus OAuth / Forge / Stripe secrets are required for completed sign-in, uploads, AI, and payments. Public browse, WID verify, and `POST /api/v1/works/register` work without them.

### Running / testing
- Dev server: `pnpm dev` → Express + Vite on `http://localhost:3000`.
- Typecheck: `pnpm check`. Tests: `pnpm test` (Vitest; no live DB required for most tests).

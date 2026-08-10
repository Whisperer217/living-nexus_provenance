# AGENTS.md

## Cursor Cloud specific instructions

Living Nexus is a single-package full-stack app (React 19 client + Express/tRPC server in one process, MySQL via Drizzle ORM). Standard scripts live in `package.json` (`dev`, `build`, `check`, `test`, `db:push`); the README has the quick start. Notes below are the non-obvious things needed to run it in this environment.

### Runtime / package manager
- Node 22 and `pnpm@10` (pinned via `packageManager`). Dependencies are installed by the startup update script (`pnpm install`).
- Ignored build scripts (`sharp`, `esbuild`, `@tailwindcss/oxide`) are fine to leave unapproved — dev server, tests, and typecheck all work without them. Do NOT run `pnpm approve-builds` (interactive).

### Local database (required for anything DB-backed)
- The app needs MySQL/MariaDB via `DATABASE_URL`. Without it `getDb()` returns `null` and most routes/UI show empty/errors. A local MariaDB is installed in the VM.
- Start the DB each session (it does not auto-start on boot):
  ```
  sudo mkdir -p /run/mysqld && sudo chown -R mysql:mysql /run/mysqld
  sudo mariadbd --user=mysql --datadir=/var/lib/mysql &
  ```
- Local dev DB/creds already provisioned: database `living_nexus`, user `ln` / password `lnpass`. Connection string: `mysql://ln:lnpass@127.0.0.1:3306/living_nexus`.
- **Schema creation gotcha:** `pnpm db:push` (which runs `drizzle-kit generate && drizzle-kit migrate`) does NOT work on a fresh database — `generate` is interactive and the committed migration history in `drizzle/` assumes a pre-existing production schema (its first journaled migration starts with `ALTER TABLE users ...`, so `migrate` fails with "Table 'users' doesn't exist"). To build the schema on a fresh DB, push the schema directly instead:
  ```
  pnpm exec drizzle-kit push --force
  ```
  This introspects `drizzle/schema.ts` and creates all ~100 tables. It is idempotent.

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
- **Client-crash gotcha:** `VITE_OAUTH_PORTAL_URL` MUST be set to a *valid* URL. `client/src/const.ts` `getLoginUrl()` runs `new URL(\`${VITE_OAUTH_PORTAL_URL}/app-auth\`)` during render (via the WhatsNewModal), so if it is unset every page crashes with `TypeError: Failed to construct 'URL'`. Any syntactically valid URL unblocks rendering.
- `MCP_READ_TOKEN` only needs to be present (length > 8) — one test in `server/tests/mcp.test.ts` asserts it exists.

### What works vs. what needs real secrets
- Works locally with just the DB + the vars above: public browsing, discover/home, WID verification pages, the public REST API (`/api/v1/*`), and provenance registration via `POST /api/v1/works/register` (Bearer API key).
- Requires real Manus-platform secrets that are NOT available locally (login button won't complete, uploads/media/AI/payments won't work): Manus OAuth (`OAUTH_SERVER_URL`), Forge storage+LLM (`BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY`), Stripe (`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`). The `[OAuth] ERROR: OAUTH_SERVER_URL is not configured` log at startup is expected locally.

### Running / testing
- Dev server: `pnpm dev` → Express + Vite on `http://localhost:3000` (unified process; picks the next free port if 3000 is busy). Serve DB first.
- Typecheck: `pnpm check`. Tests: `pnpm test` (Vitest, heavily mocked — no live DB required; ~413 tests).
- To register a work + view its provenance without OAuth: create a user + API key with the app's own `createApiKey()` helper (see `server/utils/db.ts`), then `POST /api/v1/works/register` with `Authorization: Bearer ln_...`, and view it at `/verify/<WID>`.

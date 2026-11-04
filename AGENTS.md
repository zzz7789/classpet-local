# Repository Guidelines

## Project Structure & Module Organization

- `frontend/src/` contains Vue 3 components, game helpers, and CSS; `frontend/public/` holds local pet, item, and background assets.
- `backend/` contains the ASP.NET Core 10 Minimal API: `Program.cs` configures endpoints, `Accounts.cs` handles authentication, and `GameService.cs` implements classroom operations using Dapper and MySQL.
- `database/001-schema.sql` and `backend/Database/schema.sql` contain initialization SQL; keep both copies synchronized.
- `tests/` holds JavaScript assertions, Python API acceptance tests, and browser smoke scripts. `scripts/` provides startup, backup, restore, and deployment utilities; `docs/` documents development and operations.
- Treat `release/`, `backups/`, and build output as artifacts, not primary source.

## Build, Test, and Development Commands

Use Node.js 22.12+, .NET SDK 10, and MySQL 8.4 for native development, or Docker Compose v2.

- `docker compose up -d --build --wait --wait-timeout 240`: build and start the application at `http://localhost:8080`.
- `npm --prefix frontend ci`: install locked frontend dependencies.
- `npm --prefix frontend run dev`: start Vite on port 5173; `/api` proxies to port 5050.
- `dotnet run --project backend --urls http://localhost:5050`: start the API after configuring `ConnectionStrings__Default`; see `docs/DEVELOPMENT.md`.
- `npm --prefix frontend run build` and `dotnet build backend -c Release`: validate production builds; backend warnings are errors.

## Coding Style & Naming Conventions

Match nearby formatting; existing files use compact code and two-space JavaScript block indentation. Avoid unrelated reformatting. Use PascalCase Vue component filenames and C# types, camelCase JavaScript functions, and kebab-case helper filenames. No formatter or lint script is configured. Keep assets local and preserve dependency lockfiles.

## Testing Guidelines

Run `node tests/frontend.test.mjs` and `node tests/pet-personality.test.mjs` for frontend logic. Against a running test instance, run `python tests/integration.py --url http://localhost:8080` and `python tests/shared-class.py --url http://localhost:8080`; these create accounts and classes. Browser scripts require Playwright; see `docs/VALIDATION.md`. No coverage percentage is configured. Add focused regressions for changed behavior, especially permissions, idempotency, balances, and concurrent writes. Follow existing `*.test.mjs`, `*-browser.cjs`, or descriptive Python filenames.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout. Use concise imperative commit subjects, optionally prefixed with `frontend:`, `backend:`, or `docs:`. PRs should explain behavior changes, link relevant issues, report checks and limitations, and include screenshots for visible UI changes.

## Security & Configuration

Keep credentials in ignored `.env` files; never commit database dumps or account secrets. Preserve classroom authorization and transactional updates. Back up before schema changes. Use `docker compose down` to stop services; adding `-v` deletes persistent data.

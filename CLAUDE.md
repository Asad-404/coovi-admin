# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Commands

Run from this repository with pnpm:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm preview
```

Claude may run `pnpm install`, `pnpm build`, `pnpm lint` and `pnpm test` to check changes, and may push feature branches and open pull requests; never push `master`. Do not start `pnpm dev` or `pnpm preview` unless asked. Run `pnpm build`, `pnpm lint` and `pnpm test` before committing.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, build and tests on every pull request and push to `master`. Keep it green.

## Architecture

- This is a Vite React application using MUI for UI components and React Router for authenticated admin pages.
- TanStack React Query owns server-state fetching and cache invalidation; Axios in `src/api/` communicates with the API.
- The Axios client attaches the JWT Bearer token and handles expired-auth responses. Keep authorization enforced by the API, not only by route visibility in the browser.
- Product and order data must follow the shared API contract. The API remains authoritative for prices, stock, order totals, delivery fees, and status transitions.
- Keep admin-only operations behind the existing authenticated flow and avoid putting credentials or real environment values in source control.

The cross-project contract is `..\API_ENDPOINTS.md`.

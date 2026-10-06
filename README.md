# Coovi Admin

Admin dashboard for the Coovi store: manage products, process orders and see sales at a glance.
Built with Vite, React, TypeScript, MUI, React Router and TanStack Query, talking to the
`coovi-api` service over its REST API.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional — set your API URL (see below)
pnpm dev                     # http://localhost:5173
```

You need a running `coovi-api` and an admin account to sign in.

### Configuration

| Variable       | Default                     | Purpose                    |
| -------------- | --------------------------- | -------------------------- |
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the coovi-api  |

Put it in `.env.local` (git-ignored), for example:

```bash
VITE_API_URL=https://api.example.com/api
```

Never commit real URLs, credentials or tokens.

## Scripts

| Command        | What it does                         |
| -------------- | ------------------------------------ |
| `pnpm dev`     | Dev server with hot reload           |
| `pnpm build`   | Type-check and build to `dist/`      |
| `pnpm lint`    | Lint with oxlint                     |
| `pnpm test`    | Unit tests with Vitest               |
| `pnpm preview` | Serve the production build locally   |

## How it fits together

- `src/api/` — Axios client (adds the JWT, sends you to login when it expires) and one module per
  resource. List endpoints are read page by page so stats, search and exports see every record.
- `src/pages/` — Dashboard, Products (list + form), Orders, Login.
- `src/utils/` — pure helpers (filters, stats, order status rules, CSV/print export) with tests
  next to them.
- The API is authoritative for prices, stock, totals, delivery fees and status changes; the admin
  only offers the forward order flow (Pending → Processing → Shipped → Delivered, or Cancelled
  before shipping) so stock stays correct.

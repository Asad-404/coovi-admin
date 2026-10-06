## Summary

<!-- What does this PR change, and why? -->

## Related issue

<!-- e.g. Closes #12. Delete this section if there is none. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor or cleanup
- [ ] Dependencies or tooling

## Screenshots

<!-- Before/after screenshots for any UI change. Delete this section if there is none. -->

## How was this tested?

- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] Checked the change in the running app (`pnpm dev` or `pnpm preview`)

## Checklist

- [ ] Admin-only pages and actions stay behind the authenticated flow, and the API still enforces authorization
- [ ] Prices, stock, totals, delivery fees and status transitions come from the API, not from client-side logic
- [ ] Request and response shapes match `API_ENDPOINTS.md`, and the contract is updated if endpoints changed
- [ ] React Query caches are invalidated after mutations that change server data
- [ ] No credentials, tokens or real environment values are committed

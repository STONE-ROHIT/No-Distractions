# pages/

Route-level components — one per page the router renders. A page's job is
to compose a layout + feature components + data hooks; it should stay
thin. If a page file starts accumulating real logic, that logic almost
certainly belongs in a hook or a `features/*` module instead.

`DashboardPage.tsx` is explicitly a Phase 2 placeholder (see its own
comment) — it exists to prove the protected-route + persistent-session
loop works, not as the real dashboard.

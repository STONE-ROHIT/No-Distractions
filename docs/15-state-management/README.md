# 15 · State Management

Four different kinds of state show up in this app, and the recurring
mistake in React apps generally is treating them as one thing. This page
is the practical guide; [ADR-007](../22-architecture/decisions/ADR-007-frontend-state-management.md)
is the decision record for *why* each tool was picked.

## The four kinds

### 1. Server state — TanStack Query

Data that actually lives in the database. The defining trait: it can
change **without this tab doing anything** (another tab, another device,
another user) — so "state" is really "the last known copy of something
we don't fully control," which is exactly the problem Query solves:
caching, background refetching, loading/error states, and avoiding
duplicate in-flight requests for the same data.

```ts
// context/AuthContext.tsx
const { data: user, isLoading } = useQuery({
  queryKey: authMeQueryKey,
  queryFn: fetchCurrentUser,
  retry: false,
});
```

`retry: false` here is deliberate, not an oversight: a 401 on this
particular query means "no one is logged in", a completely normal
outcome, not a transient failure worth retrying.

### 2. Cross-cutting UI state — React Context

State more than a couple of unrelated components need to read, that
*isn't* server data. This app has exactly two: the auth session
(`AuthContext`) and the theme (`ThemeContext`) — both thin wrappers (see
`docs/06-frontend-architecture`), not general-purpose stores. **Context
is not a shortcut for prop-drilling in general** — reach for it only
when the alternative is genuinely threading a prop through several
layers of components that don't otherwise care about it.

### 3. Persistent, per-device state — `localStorage`

State that should survive a page reload but is tied to *this browser*,
not the account. Currently just the theme preference
(`context/theme-context.ts`'s `readStoredPreference`) — read once on
`ThemeProvider` mount, written on every change. The inline script in
`index.html` reads the same key before React even loads, which is what
avoids a flash of the wrong theme on first paint.

### 4. Local, ephemeral state — `useState`

Everything else: a form's field values, whether the mobile sidebar
drawer is open (`AppLayout`), whether a dropdown menu is expanded
(`Topbar`). The test for whether something belongs here: if you deleted
the component, would anyone miss this state? If not, it's local.

## What decides which one

```text
Does it come from the API (or represent something the server owns)?
  → TanStack Query

Otherwise, do several unrelated parts of the tree need to read it?
  → React Context (new provider — see context/README.md's three-file split)

Otherwise, should it survive a reload, independent of login?
  → localStorage, synced into a Context on mount

Otherwise
  → useState, in the component that owns it
```

## A worked example: the mobile sidebar drawer

`AppLayout` owns `isSidebarOpen` as local `useState` — not Context, even
though both `Sidebar` and `Topbar` need to read/trigger it. The reason:
only `AppLayout` and its two direct children care; nothing else in the
app has any reason to know whether the drawer is open. Promoting it to
Context would add a provider for a value with exactly one real consumer
tree. Contrast with `resolvedTheme`: `PublicHeader`, `Topbar`,
`Sidebar`'s active-link color, and eventually the video player will all
need it, in completely unrelated parts of the tree — that's what
actually justifies a Context.

## Try it yourself

`ThemeContext` and `AppLayout`'s `isSidebarOpen` look structurally
similar (both are "a piece of UI state with a setter"). Write down the
specific reason one is Context and the other is local `useState`, without
re-reading the paragraph above.

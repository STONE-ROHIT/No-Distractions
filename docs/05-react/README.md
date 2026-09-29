# 05 · React

This covers the React concepts this codebase actually uses, each with a
real example from it — not a general React tutorial. If you already know
React well, skip to `docs/06-frontend-architecture` instead.

## Components and props

A component is a function that returns what should appear on screen (JSX
— HTML-like syntax that compiles to regular function calls). Props are
just its arguments:

```tsx
// components/EmptyState.tsx
interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}
export function EmptyState({ title, description, action }: EmptyStateProps) { ... }

// used as:
<EmptyState title="Your library is empty" description="..." action={<Link .../>} />
```

## State: `useState`

State is data a component remembers between renders, and re-renders the
component when it changes. `LoginForm` is the simplest real example: two
`useState` calls hold the typed email and password, and every keystroke
(`onChange`) updates them — this is a **controlled input**: the input's
displayed value comes *from* React state rather than the DOM owning it,
which is what makes "read the current value to submit the form" trivial.

## Effects: `useEffect`, and when NOT to use one

An effect synchronizes a component with something *outside* React — the
DOM, `localStorage`, a subscription. `ThemeContext.tsx` uses one exactly
that way: React state (`resolvedTheme`) changes, and the effect pushes
that value onto `document.documentElement` (a `data-theme` attribute),
which isn't something React itself renders.

The codebase also deliberately does **NOT** use an effect for something
that looks similar: closing the mobile sidebar drawer on navigation. An
earlier version watched `location.pathname` in an effect and called
`setIsSidebarOpen(false)` when it changed — React's current guidance
(and the `react-hooks/set-state-in-effect` lint rule this project
enables) flags that pattern: "when X happens, also update state Y" is
usually better handled directly in the event that causes X, not by
reacting to its aftermath. `layouts/AppLayout.tsx` and `Sidebar.tsx` now
close the drawer directly from each nav link's `onClick` instead — see
the comment in `AppLayout.tsx` for the full reasoning, including the one
edge case (browser back/forward) this doesn't cover.

## `useContext`, via a custom hook

Reading Context directly (`useContext(SomeContext)`) is verbose and
returns `undefined` outside a provider with no useful error. Every
provider in this codebase wraps that in its own hook instead:

```ts
// context/useAuth.ts
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
```

Now a component just calls `useAuth()`, and a real programmer error
(forgetting the provider) fails loudly with a clear message instead of a
confusing `undefined` bug three lines later.

## `useSyncExternalStore`: the hook one level up from `useEffect`

`hooks/useMediaQuery.ts` tracks the browser's `matchMedia` result live.
The tempting approach is `useState` + `useEffect` (read the value, and
subscribe to change events) — it works, but can show a stale value for
one render before the effect runs. `useSyncExternalStore` is React's
purpose-built hook for exactly this shape of problem ("state that lives
outside React and can change on its own"):

```ts
return useSyncExternalStore(
  subscribe,                                    // how to listen for changes
  () => window.matchMedia(query).matches,        // how to read the current value
  () => false,                                   // value when there's no window (unused here — client-only app)
);
```

`ThemeContext` uses this (via `useMediaQuery`) to track
`prefers-color-scheme` for the `'system'` theme option.

## Other hooks in use

- **`useMemo`** (`AuthContext.tsx`, `ThemeContext.tsx`) — recomputes the
  context value object only when something it depends on actually
  changed, so components reading the context don't re-render on every
  parent render for no reason.
- **`useCallback`** (`ThemeContext.tsx`'s `setPreference`) — same idea,
  for a function passed down through context.
- **`useId`** (`TextField.tsx`) — generates a unique, stable ID to link a
  `<label>` to its `<input>` (`htmlFor`/`id`) and the input to its error
  message (`aria-describedby`), without risking a hardcoded ID colliding
  if the component's ever rendered twice on one page.
- **`useRef`** (`Topbar.tsx`) — a mutable value that doesn't trigger a
  re-render when it changes; used to detect "was the click outside this
  menu" without state.

## Routing (React Router)

- **`<Routes>` / `<Route>`** — `App.tsx` maps URL paths to page
  components.
- **Nested (layout) routes** — a `<Route>` with no `path`, just an
  `element`, wraps every `<Route>` nested inside it. `App.tsx` uses this
  so `ProtectedRoute` and `AppLayout` apply once to `/dashboard`,
  `/library`, and `/stats` together, rather than each page wrapping
  itself — see `docs/06-frontend-architecture`.
- **`<Outlet />`** (`AppLayout.tsx`) — where a layout route renders
  whichever nested route actually matched.
- **`<NavLink>`** (`Sidebar.tsx`) — like `<Link>`, but its `className`
  can be a function of whether it's the currently active route, which is
  how the sidebar's highlighter-yellow active state is computed.
- **`<Navigate>`** (`ProtectedRoute.tsx`) — redirects during render
  (rather than imperatively in an effect) when there's no logged-in user.
- **`useLocation`** — used in `ProtectedRoute` to remember where a
  visitor was headed before being bounced to `/login` (`state={{ from:
  location }}`), for a possible future "redirect back after login".

## Try it yourself

`DashboardPage`, `LibraryPage`, and `StatsPage` are all "thin" — find the
specific rule in `pages/README.md` that explains why, and identify what
in `DashboardPage` is already at risk of violating it as more phases add
real logic to it.

# layouts/

Structural wrappers that stay constant across many pages — where things go
on screen, not what feature owns them.

- `AppLayout.tsx` — the authenticated shell (`Sidebar` + `Topbar` around
  an `<Outlet />`). Every page nested under it in `App.tsx`'s routes gets
  the shell, and is guarded by `ProtectedRoute` once, at the layout
  level, rather than each page checking auth itself.
- `Sidebar.tsx` / `Topbar.tsx` — split out because each independently
  handles its own responsive/interactive behavior (the sidebar's
  drawer-vs-static positioning; the topbar's user menu).
- `PublicHeader.tsx` — the lightweight header for signed-out pages
  (landing, login, register, 404) — deliberately a different, simpler
  component rather than reusing `Topbar`, since it has none of
  `AppLayout`'s concerns (no sidebar to open, no user menu when signed
  out).

A layout defines structure; it should not own feature data itself
(`AppLayout` reads `user` only to decide what `Topbar` shows, via
`useAuth` — the same session state every other page can read).

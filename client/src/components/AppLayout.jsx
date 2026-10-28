import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BookOpen, ChartLine, LayoutDashboard, ListVideo, LogOut, PlaySquare, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import OfflineBanner from './OfflineBanner.jsx'

/** Brand mark: a small play glyph in an emerald rounded square. */
export function BrandMark({ size = 'md' }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const glyph = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <span
      className={`flex ${box} items-center justify-center rounded-lg bg-emerald-600`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className={`${glyph} fill-white`}>
        <path d="M9.5 7.5v9c0 .8.9 1.3 1.6.9l7.2-4.5c.6-.4.6-1.3 0-1.7l-7.2-4.5c-.7-.4-1.6.1-1.6.8z" />
      </svg>
    </span>
  )
}

/**
 * Layout for all authenticated pages: a top navbar and, on small
 * screens, a fixed bottom tab bar.
 */
export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    // Navigate away first, then clear the user on the next tick: the auth
    // guard on /app would otherwise race us to /login. The small delay is
    // imperceptible and keeps the landing page as the logout destination.
    navigate('/', { replace: true })
    setTimeout(logout, 120)
  }

  const tabs = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/library', label: 'Library', icon: BookOpen, end: false },
    { to: '/app/playlists', label: 'Playlists', icon: ListVideo, end: false },
    { to: '/app/search', label: 'Discover', icon: Search, end: false },
    { to: '/app/stats', label: 'Activity', icon: ChartLine, end: false },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Offline status (renders nothing when everything is fine) */}
      <OfflineBanner />
      <header className="nd-chrome sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/app" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="hidden text-[15px] font-semibold tracking-tight text-stone-900 sm:block">
              No Distractions
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {tabs.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-stone-100 text-stone-900'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/app/watch"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <PlaySquare className="h-4 w-4" />
              <span className="hidden sm:inline">Watch a video</span>
              <span className="sm:hidden">Watch</span>
            </Link>

            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-600"
              title={user?.name}
            >
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile tab bar */}
      <nav
        className="nd-chrome fixed bottom-0 left-0 right-0 z-40 flex border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
        aria-label="Mobile"
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-700' : 'text-stone-500'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

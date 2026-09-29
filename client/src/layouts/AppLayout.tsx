import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * The authenticated app shell: sidebar + topbar around a scrollable
 * content area rendered via React Router's <Outlet /> — see App.tsx,
 * where every page under /dashboard, /library, /stats is a *nested*
 * route inside this layout route, wrapped once in ProtectedRoute rather
 * than each page guarding itself.
 */
export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // A drawer left open across a navigation is a common small bug. Closed
  // directly by Sidebar's onNavigate (fired when a NavLink is clicked)
  // rather than by an effect watching the route — React's guidance is to
  // handle "something else needs to change too" in the event that caused
  // it, not by reacting to its result afterwards; see
  // react-hooks/set-state-in-effect. (A browser back/forward navigation
  // while the drawer is open won't close it — the backdrop is still one
  // tap away, and this is materially rarer than a plain nav-link click.)

  useEffect(() => {
    if (!isSidebarOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />

      {/* Scrim: only rendered (and only intercepts clicks) below `md`,
          while the drawer is open. A literal black, not the `ink` token
          — a backdrop needs to stay a darkening scrim in both themes,
          not flip to a near-white overlay in dark mode. */}
      {isSidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { BarChart3, LayoutDashboard, Library, Play } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cx } from '../utils/cx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/stats', label: 'Statistics', Icon: BarChart3 },
];

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

/**
 * Always in the DOM; positioning does the responsive work. Below the `md`
 * breakpoint it's `fixed` and slid off-screen unless `isOpen` (a drawer
 * over the content); at `md` and up it's a static column in the layout's
 * flex row, `isOpen` no longer relevant. See AppLayout for the state and
 * the backdrop.
 */
export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-6 border-r border-rule bg-surface p-4 transition-transform duration-200 ease-out',
        'md:static md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <NavLink to="/" onClick={onNavigate} className="flex items-center gap-2 px-2 py-1">
        <Play aria-hidden="true" size={18} className="fill-marker text-marker" />
        <span className="font-serif text-lg text-ink">No Distractions</span>
      </NavLink>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-marker text-marker-ink'
                  : 'text-ink-muted hover:bg-wash hover:text-ink',
              )
            }
          >
            <Icon aria-hidden="true" size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

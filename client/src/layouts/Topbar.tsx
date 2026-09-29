import { LogOut, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/useAuth';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Closes the user menu on an outside click or Escape — the two things
  // any menu-like widget is expected to respond to. Only one menu exists
  // in the app right now, so this lives here rather than as a shared
  // component; extract it if a second one shows up.
  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-rule px-4">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="rounded-md p-1.5 text-ink-muted hover:bg-wash hover:text-ink md:hidden"
        aria-label="Open menu"
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      <div className="flex flex-1 items-center justify-end gap-3">
        <ThemeToggle />

        {user && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-wash"
            >
              <Avatar name={user.name} size="sm" />
              <span className="hidden text-sm font-medium text-ink sm:inline">{user.name}</span>
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-rule bg-surface py-1 shadow-lg"
              >
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-wash"
                >
                  <LogOut aria-hidden="true" size={15} />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

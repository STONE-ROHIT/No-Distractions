import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/useAuth';

/** Header for the signed-out pages: landing, login, register, 404. */
export function PublicHeader() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-10">
      <Link to="/" className="flex items-center gap-2">
        <Play aria-hidden="true" size={18} className="fill-marker text-marker" />
        {/* Icon-only below `sm`: at a phone width there isn't room for the
            full wordmark AND the theme toggle AND both auth links without
            wrapping mid-word (this used to wrap "Distractions" onto its
            own line). */}
        <span className="hidden whitespace-nowrap font-serif text-lg text-ink sm:inline">
          No Distractions
        </span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />
        {user ? (
          <Link
            to="/dashboard"
            className="text-sm font-medium text-ink underline underline-offset-2"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="text-sm font-medium whitespace-nowrap text-ink-muted hover:text-ink"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium whitespace-nowrap text-canvas hover:opacity-90"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

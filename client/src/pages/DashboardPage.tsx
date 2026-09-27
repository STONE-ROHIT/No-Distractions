import { useAuth } from '../context/useAuth';
import { Button } from '../components/Button';

/**
 * Temporary placeholder proving the full auth loop works end to end
 * (register/login → protected route → persistent session → logout). The
 * real learning dashboard (Continue Learning, My Library, Progress) is
 * built in Phase 7/8 — see the root README's roadmap.
 */
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-neutral-100">
      <p className="text-sm font-medium tracking-wide text-neutral-500">No Distractions</p>
      <h1 className="text-2xl font-semibold">Welcome, {user?.name}.</h1>
      <p className="max-w-md text-sm text-neutral-400">
        This is a placeholder — the real dashboard (continue learning, library, progress) is built
        in a later phase.
      </p>
      <Button variant="secondary" onClick={() => void logout()}>
        Log out
      </Button>
    </main>
  );
}

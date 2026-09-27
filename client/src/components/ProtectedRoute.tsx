import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/**
 * Wrap any route element that requires an authenticated user. While the
 * initial session check is in flight (AuthContext's `isLoading`, which is
 * only ever true for that one check) it shows a small status message
 * rather than a blank screen, and never flashes the login page before
 * redirecting.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-500"
      >
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { fetchCurrentUser, logoutRequest } from '../api/auth';
import { AuthContext, authMeQueryKey, type AuthContextValue } from './auth-context';

/**
 * Shared across the whole app because "who is logged in" genuinely is
 * needed in many unrelated places at once (a route guard, a navbar, a
 * settings page) — see context/README.md on why most other state should
 * NOT end up here. Login/register themselves are NOT part of this
 * context: only the login/register forms need those mutations, so they
 * own them directly (see features/auth/) and just update this same
 * cached query on success.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // A 401 here is an expected, common outcome (no one logged in yet) —
  // not a transient failure worth retrying. The Axios interceptor in
  // api/client.ts already tries exactly one silent token refresh before
  // this ever surfaces as an error, which is what makes a page reload
  // with a still-valid refresh token stay logged in (persistent auth)
  // without this query needing to know anything about tokens itself.
  const { data: user, isLoading } = useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      logout: async () => {
        await logoutRequest();
        // A fresh clear (not just resetting the `me` query) so no
        // user-scoped data from this session — library, progress, notes,
        // once those phases land — lingers in cache for whoever's next.
        queryClient.clear();
      },
    }),
    [user, isLoading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

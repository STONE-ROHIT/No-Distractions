import { createContext } from 'react';
import type { User } from '../types/user';

/**
 * Split into its own file (no component) specifically so AuthContext.tsx
 * can export the `AuthProvider` component and ONLY that component — React
 * Fast Refresh can only preserve state across a hot-reload for a module
 * whose exports are entirely components, so anything else (this context
 * object, the query key, the `useAuth` hook) lives elsewhere. See
 * useAuth.ts.
 */
export const authMeQueryKey = ['auth', 'me'] as const;

export interface AuthContextValue {
  user: User | null;
  /** True only while the initial session check is in flight. */
  isLoading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

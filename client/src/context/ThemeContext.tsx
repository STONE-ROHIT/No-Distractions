import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  readStoredPreference,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference,
} from './theme-context';

/**
 * Owns the light/dark theme. The preference is *persistent, per-device*
 * state: it lives in localStorage (not the database) because it applies to
 * signed-out visitors too, and because a person plausibly wants dark on a
 * laptop at night and light on a phone in daylight. See ADR-007.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // A function passed to useState runs only once, on first render — not on
  // every render — so localStorage is read exactly once.
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;

  // Syncing React state OUT to the page (an attribute on <html> that the
  // CSS variables key off) is what an effect is for.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Couldn't persist it, but the choice still applies for this session.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

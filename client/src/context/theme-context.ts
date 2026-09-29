import { createContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/**
 * localStorage key for the saved preference. The inline script in
 * index.html (which sets the theme before first paint) reads the same key
 * and applies the same rule — keep the two in sync.
 */
export const THEME_STORAGE_KEY = 'nd-theme';

export function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Storage can throw (disabled, some private-browsing modes).
    return 'system';
  }
}

export interface ThemeContextValue {
  /** What the user chose: light, dark, or follow the operating system. */
  preference: ThemePreference;
  /** What is actually showing right now (never 'system'). */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

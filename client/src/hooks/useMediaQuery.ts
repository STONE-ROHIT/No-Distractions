import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches, kept live as it changes
 * (window resized, OS switches to dark mode, ...).
 *
 * The browser's matchMedia is an *external store* — state that lives
 * outside React and notifies subscribers when it changes — which is
 * exactly what useSyncExternalStore is for. Doing this with
 * useState + useEffect works most of the time but can render one frame
 * with a stale value; this can't.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  // Third argument: the value to use where there is no window (server
  // rendering). This app is client-only, but the API requires it.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

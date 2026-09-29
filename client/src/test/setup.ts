// Runs once before the Vitest test suite. Wires up jest-dom's custom
// matchers (toBeInTheDocument, toHaveTextContent, ...) so component tests
// can make readable assertions against rendered DOM nodes.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmounts every component rendered by a test and clears the DOM after
// it finishes. React Testing Library normally does this automatically,
// but only when it can detect the test framework's global afterEach —
// this project deliberately doesn't set Vitest's `globals: true` (tests
// import describe/it/expect explicitly instead), so that auto-detection
// doesn't fire and this has to be explicit. Without it, a second test in
// the same file that renders the same component sees both copies in the
// DOM at once.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia at all. Anything using ThemeProvider
// (which calls useMediaQuery for prefers-color-scheme) needs this to
// exist; defaults to "does not match" (light), same as production when a
// browser genuinely has no preference set. addEventListener/
// removeEventListener are real no-op-compatible functions — useMediaQuery
// calls them — rather than `vi.fn()` stand-ins, so a test that DOES want
// to simulate a change can still swap this per-test without touching this
// file.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

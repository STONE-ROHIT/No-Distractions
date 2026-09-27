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

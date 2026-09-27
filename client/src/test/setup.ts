// Runs once before the Vitest test suite. Wires up jest-dom's custom
// matchers (toBeInTheDocument, toHaveTextContent, ...) so component tests
// can make readable assertions against rendered DOM nodes.
import '@testing-library/jest-dom/vitest';

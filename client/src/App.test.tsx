import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

// Smoke test for the Phase 1 scaffold: proves Vitest + React Testing
// Library are wired up correctly end-to-end (jsdom environment, Tailwind
// classes applied, component renders). Replaced by real feature tests
// once the actual landing page and app shell exist.
describe('App', () => {
  it('renders the product name and tagline', () => {
    render(<App />);
    expect(screen.getByText('No Distractions')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /learn from youtube\. without the distractions\./i }),
    ).toBeInTheDocument();
  });
});

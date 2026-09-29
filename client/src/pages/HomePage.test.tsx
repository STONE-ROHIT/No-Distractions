import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import type { User } from '../types/user';
import { HomePage } from './HomePage';

vi.mock('../api/auth');
const { fetchCurrentUser } = await import('../api/auth');

function renderHomePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <HomePage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  it('renders the headline and every item of the distractions list', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderHomePage();

    expect(
      await screen.findByRole('heading', { name: /learn from youtube\./i }),
    ).toBeInTheDocument();
    for (const item of ['Recommendations', 'Shorts', 'Comments', 'The autoplay queue']) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('points the CTA at /register for a signed-out visitor', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderHomePage();

    const cta = await screen.findByRole('link', { name: /start learning/i });
    expect(cta).toHaveAttribute('href', '/register');
  });

  it('points the CTA at /dashboard for a signed-in visitor', async () => {
    const fakeUser: User = {
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      avatar: null,
      preferences: { theme: 'system', autoplayNext: false, defaultPlaybackRate: 1 },
      createdAt: new Date().toISOString(),
    };
    vi.mocked(fetchCurrentUser).mockResolvedValue(fakeUser);
    renderHomePage();

    const cta = await screen.findByRole('link', { name: /go to dashboard/i });
    expect(cta).toHaveAttribute('href', '/dashboard');
  });
});

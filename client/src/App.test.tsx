import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import type { User } from './types/user';

vi.mock('./api/auth');
const { fetchCurrentUser } = await import('./api/auth');

const fakeUser: User = {
  id: '507f1f77bcf86cd799439011',
  name: 'Ada',
  email: 'ada@example.com',
  avatar: null,
  preferences: { theme: 'system', autoplayNext: false, defaultPlaybackRate: 1 },
  createdAt: new Date().toISOString(),
};

function renderApp(initialRoute: string) {
  // A fresh QueryClient per render — otherwise the `me` query's cached
  // result would leak between tests regardless of what each mocks.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routing', () => {
  it('shows the home page at /', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderApp('/');
    expect(await screen.findByText('No Distractions')).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor from /dashboard to /login', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders the dashboard for an authenticated visitor', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(fakeUser);
    renderApp('/dashboard');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome, ada\./i })).toBeInTheDocument();
    });
  });

  it('shows a not-found page for an unknown route', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderApp('/this-route-does-not-exist');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('shows a loading status, not a blank screen, while the session check is pending', () => {
    // A promise that never settles keeps the session check "in flight".
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise(() => {}));
    renderApp('/dashboard');
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });
});

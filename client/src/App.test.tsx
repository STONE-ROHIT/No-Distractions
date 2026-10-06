import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import type { User } from './types/user';

vi.mock('./api/auth');
vi.mock('./api/library');
vi.mock('./api/progress');
const { fetchCurrentUser } = await import('./api/auth');
const { fetchLibraryRequest } = await import('./api/library');
const { fetchContinueLearningRequest } = await import('./api/progress');

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
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Dashboard and Library both fetch this; none of the assertions below
  // are about library content, so an empty, deterministic default means
  // every test gets a settled query instead of an unmocked real request.
  vi.mocked(fetchLibraryRequest).mockResolvedValue([]);
  vi.mocked(fetchContinueLearningRequest).mockResolvedValue([]);
});

describe('public routing', () => {
  it('shows the home page at /', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: /learn from youtube\./i }),
    ).toBeInTheDocument();
  });

  it('shows a not-found page for an unknown route', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderApp('/this-route-does-not-exist');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});

describe.each([
  ['/dashboard', /welcome back, ada\./i],
  ['/library', /^library$/i],
  ['/stats', /^statistics$/i],
])('the protected route %s', (path, headingPattern) => {
  it('redirects an unauthenticated visitor to /login', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('not logged in'));
    renderApp(path);
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders inside the app shell for an authenticated visitor', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(fakeUser);
    renderApp(path);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: headingPattern })).toBeInTheDocument();
    });
    // The shell itself: sidebar nav is present, and it's this user's page.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('shows a loading status, not a blank screen, while the session check is pending', () => {
    // A promise that never settles keeps the session check "in flight".
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise(() => {}));
    renderApp(path);
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });
});

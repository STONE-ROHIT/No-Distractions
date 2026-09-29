import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import type { User } from '../types/user';
import { AppLayout } from './AppLayout';

vi.mock('../api/auth');
const { fetchCurrentUser } = await import('../api/auth');

const fakeUser: User = {
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  avatar: null,
  preferences: { theme: 'system', autoplayNext: false, defaultPlaybackRate: 1 },
  createdAt: new Date().toISOString(),
};

function renderShell() {
  vi.mocked(fetchCurrentUser).mockResolvedValue(fakeUser);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<p>dashboard content</p>} />
                <Route path="/library" element={<p>library content</p>} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// The mobile drawer's backdrop is only ever conditionally rendered (not
// just CSS-hidden), so its presence in the DOM is a reliable signal of
// open/closed regardless of jsdom's lack of real viewport-based CSS.
function backdrop() {
  return document.querySelector('.md\\:hidden.bg-black\\/50');
}

describe('AppLayout mobile drawer', () => {
  it('is closed by default, and the hamburger button opens it', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('dashboard content');

    expect(backdrop()).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(backdrop()).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('dashboard content');

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(backdrop()!);
    expect(backdrop()).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('dashboard content');

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.keyboard('{Escape}');
    expect(backdrop()).not.toBeInTheDocument();
  });

  it('closes when a sidebar nav link is clicked', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('dashboard content');

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(backdrop()).toBeInTheDocument();

    // There are two "Library" links once the drawer is open (desktop
    // static + mobile drawer copies aren't duplicated — Sidebar renders
    // once — so getByRole is unambiguous).
    await user.click(screen.getByRole('link', { name: /library/i }));
    await screen.findByText('library content');
    expect(backdrop()).not.toBeInTheDocument();
  });
});

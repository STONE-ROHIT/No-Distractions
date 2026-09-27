import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

vi.mock('../../../api/auth');
const { loginRequest } = await import('../../../api/auth');

function renderLoginForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  it('submits the entered email and password', async () => {
    const user = userEvent.setup();
    vi.mocked(loginRequest).mockResolvedValue({
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      avatar: null,
      preferences: { theme: 'system', autoplayNext: false, defaultPlaybackRate: 1 },
      createdAt: new Date().toISOString(),
    });

    renderLoginForm();
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Checking call[0][0] rather than toHaveBeenCalledWith(...) on
    // purpose: TanStack Query v5 calls mutationFn with a second, internal
    // context argument (client, meta, mutationKey) that this test has no
    // business asserting on.
    expect(vi.mocked(loginRequest).mock.calls[0]?.[0]).toEqual({
      email: 'ada@example.com',
      password: 'correct-horse-battery',
    });
  });

  it("shows the server's error message when login fails", async () => {
    const user = userEvent.setup();
    vi.mocked(loginRequest).mockRejectedValue(
      new AxiosError('Request failed', '401', undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { error: { message: 'Invalid email or password' } },
      }),
    );

    renderLoginForm();
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

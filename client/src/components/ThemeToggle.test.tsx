import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import { THEME_STORAGE_KEY } from '../context/theme-context';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  it('defaults to "system" with nothing stored', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: /match system theme/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('switches the resolved theme and persists the choice when dark is picked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('radio', { name: /^dark theme$/i }));

    expect(screen.getByRole('radio', { name: /^dark theme$/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('reads a previously stored preference on mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: /^light theme$/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

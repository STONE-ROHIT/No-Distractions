import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the product name and tagline', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('No Distractions')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /learn from youtube\. without the distractions\./i }),
    ).toBeInTheDocument();
  });
});

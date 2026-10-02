import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { LibraryEntry } from '../types/video';
import { LibraryPage } from './LibraryPage';

vi.mock('../api/library');
const { fetchLibraryRequest } = await import('../api/library');

const fakeEntry: LibraryEntry = {
  savedAt: '2024-02-01T00:00:00Z',
  video: {
    id: 'vid123',
    youtubeVideoId: 'dQw4w9WgXcQ',
    title: 'Sampling Theorem Explained',
    description: '',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    channelTitle: 'Signals Channel',
    durationSeconds: 933,
    embeddable: true,
    publishedAt: '2024-01-01T00:00:00Z',
  },
};

function renderLibraryPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LibraryPage', () => {
  it('shows an empty state with no saved videos', async () => {
    vi.mocked(fetchLibraryRequest).mockResolvedValue([]);
    renderLibraryPage();
    expect(await screen.findByText('Your library is empty')).toBeInTheDocument();
  });

  it('shows a card for each saved video, linking to its watch page', async () => {
    vi.mocked(fetchLibraryRequest).mockResolvedValue([fakeEntry]);
    renderLibraryPage();

    const link = await screen.findByRole('link', { name: /sampling theorem explained/i });
    expect(link).toHaveAttribute('href', '/videos/vid123');
    expect(screen.getByText('Signals Channel')).toBeInTheDocument();
    expect(screen.getByText('15:33')).toBeInTheDocument();
  });
});

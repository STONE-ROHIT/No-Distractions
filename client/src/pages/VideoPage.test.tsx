import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Video } from '../types/video';
import { VideoPage } from './VideoPage';

vi.mock('../api/videos');
const { fetchVideoRequest } = await import('../api/videos');

const fakeVideo: Video = {
  id: 'vid123',
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Sampling Theorem Explained',
  description: '',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  channelTitle: 'Signals Channel',
  durationSeconds: 933,
  embeddable: true,
  publishedAt: '2024-01-01T00:00:00Z',
};

function renderVideoPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/videos/vid123']}>
        <Routes>
          <Route path="/videos/:videoId" element={<VideoPage />} />
          <Route path="/library" element={<p>library page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VideoPage', () => {
  it('shows a loading state, then the video title, channel, and an embedded player', async () => {
    vi.mocked(fetchVideoRequest).mockResolvedValue(fakeVideo);
    renderVideoPage();

    expect(screen.getByRole('status', { name: /loading video/i })).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Sampling Theorem Explained' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Signals Channel')).toBeInTheDocument();
    const iframe = screen.getByTitle('Sampling Theorem Explained');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('youtube-nocookie.com/embed/dQw4w9WgXcQ'),
    );
  });

  it('shows the "watch on YouTube" fallback when the video is not embeddable', async () => {
    vi.mocked(fetchVideoRequest).mockResolvedValue({ ...fakeVideo, embeddable: false });
    renderVideoPage();

    expect(await screen.findByRole('link', { name: /watch on youtube/i })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  });

  it('shows a specific not-found message for a 404, with a way back to the library', async () => {
    vi.mocked(fetchVideoRequest).mockRejectedValue(
      new AxiosError('Request failed', '404', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { error: { message: 'Video not found.' } },
      }),
    );

    renderVideoPage();

    expect(await screen.findByText('Video not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to library/i })).toHaveAttribute(
      'href',
      '/library',
    );
  });
});

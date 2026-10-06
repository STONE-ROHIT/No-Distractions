import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createFakeYoutubeApi } from '../test/fakeYoutubePlayer';
import type { Video } from '../types/video';
import type { WatchProgress } from '../types/progress';
import { VideoPage } from './VideoPage';

vi.mock('../api/videos');
vi.mock('../api/progress');
vi.mock('../features/videos/lib/youtubeIframeApi');
const { fetchVideoRequest } = await import('../api/videos');
const { fetchProgressRequest, saveProgressRequest } = await import('../api/progress');
const { loadYoutubeIframeApi } = await import('../features/videos/lib/youtubeIframeApi');

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
  it('shows the "watch on YouTube" fallback when the video is not embeddable, without loading a player', async () => {
    vi.mocked(fetchVideoRequest).mockResolvedValue({ ...fakeVideo, embeddable: false });
    vi.mocked(fetchProgressRequest).mockResolvedValue(null);

    renderVideoPage();

    expect(await screen.findByRole('link', { name: /watch on youtube/i })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(loadYoutubeIframeApi).not.toHaveBeenCalled();
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
    vi.mocked(fetchProgressRequest).mockResolvedValue(null);

    renderVideoPage();

    expect(await screen.findByText('Video not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to library/i })).toHaveAttribute(
      'href',
      '/library',
    );
  });

  describe('with a real (faked) player', () => {
    async function renderReady(progress: WatchProgress | null) {
      vi.mocked(fetchVideoRequest).mockResolvedValue(fakeVideo);
      vi.mocked(fetchProgressRequest).mockResolvedValue(progress);
      const fake = createFakeYoutubeApi();
      vi.mocked(loadYoutubeIframeApi).mockResolvedValue(fake.YT);

      renderVideoPage();
      await screen.findByRole('region', { name: /video player/i });
      act(() => fake.simulateReady());
      return fake;
    }

    it('resumes from the saved position via playerVars.start', async () => {
      const fake = await renderReady({
        positionSeconds: 142,
        durationSeconds: 933,
        percentage: 15,
        completed: false,
        lastWatchedAt: '2026-02-01T00:00:00Z',
      });
      expect(fake.getInstance()?.options.playerVars?.start).toBe(142);
    });

    it('shows the saved percentage before any new playback happens', async () => {
      await renderReady({
        positionSeconds: 466,
        durationSeconds: 933,
        percentage: 50,
        completed: false,
        lastWatchedAt: '2026-02-01T00:00:00Z',
      });
      expect(await screen.findByText('50% watched')).toBeInTheDocument();
    });

    it('saves progress and updates the display when the player reports it', async () => {
      vi.mocked(saveProgressRequest).mockResolvedValue({
        positionSeconds: 500,
        durationSeconds: 1000,
        percentage: 50,
        completed: false,
        lastWatchedAt: '2026-02-01T00:00:00Z',
      });
      const fake = await renderReady(null);
      fake.setCurrentTime(500);
      fake.setDuration(1000);

      act(() => fake.simulateStateChange(fake.YT.PlayerState.PAUSED)); // pausing flushes a progress report

      await waitFor(() =>
        expect(saveProgressRequest).toHaveBeenCalledWith('vid123', {
          positionSeconds: 500,
          durationSeconds: 1000,
        }),
      );
      expect(await screen.findByText('50% watched')).toBeInTheDocument();
    });

    it('marks a video complete on demand, saving the last known position', async () => {
      const user = userEvent.setup();
      vi.mocked(saveProgressRequest).mockResolvedValue({
        positionSeconds: 300,
        durationSeconds: 933,
        percentage: 32,
        completed: true,
        lastWatchedAt: '2026-02-01T00:00:00Z',
      });
      const fake = await renderReady({
        positionSeconds: 300,
        durationSeconds: 933,
        percentage: 32,
        completed: false,
        lastWatchedAt: '2026-02-01T00:00:00Z',
      });
      void fake; // only used to reach "ready" above

      await user.click(screen.getByRole('button', { name: /mark complete/i }));

      await waitFor(() =>
        expect(saveProgressRequest).toHaveBeenCalledWith('vid123', {
          positionSeconds: 300,
          durationSeconds: 933,
          completed: true,
        }),
      );
      expect(await screen.findByRole('button', { name: /mark incomplete/i })).toBeInTheDocument();
    });
  });
});

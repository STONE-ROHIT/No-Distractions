import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ImportVideoForm } from './ImportVideoForm';

vi.mock('../../../api/videos');
vi.mock('../../../api/library');
const { importVideoRequest } = await import('../../../api/videos');

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<ImportVideoForm />} />
          <Route path="/videos/:id" element={<p>video page</p>} />
          <Route path="/library" element={<p>library page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ImportVideoForm', () => {
  it('navigates to the video page after importing a single video', async () => {
    const user = userEvent.setup();
    vi.mocked(importVideoRequest).mockResolvedValue({
      type: 'video',
      video: { id: 'vid123' } as never,
    });

    renderForm();
    await user.type(
      screen.getByLabelText(/import a video or playlist/i),
      'https://youtu.be/dQw4w9WgXcQ',
    );
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText('video page')).toBeInTheDocument();
  });

  it('navigates to the library after importing a playlist (no single page to land on)', async () => {
    const user = userEvent.setup();
    vi.mocked(importVideoRequest).mockResolvedValue({
      type: 'playlist',
      playlistTitle: 'Digital Communications',
      videos: [],
    });

    renderForm();
    await user.type(
      screen.getByLabelText(/import a video or playlist/i),
      'https://www.youtube.com/playlist?list=PLxyz',
    );
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText('library page')).toBeInTheDocument();
  });

  it("shows the server's error message on failure and stays on the form", async () => {
    const user = userEvent.setup();
    vi.mocked(importVideoRequest).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Enter a valid YouTube video or playlist URL.' } } },
    });

    renderForm();
    await user.type(screen.getByLabelText(/import a video or playlist/i), 'https://vimeo.com/123');
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a valid youtube/i);
  });
});

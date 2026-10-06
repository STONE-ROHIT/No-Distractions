import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeYoutubeApi } from '../../../test/fakeYoutubePlayer';
import { useYoutubePlayer } from './useYoutubePlayer';

vi.mock('../lib/youtubeIframeApi');
const { loadYoutubeIframeApi } = await import('../lib/youtubeIframeApi');

async function setUpReadyPlayer(options: Parameters<typeof useYoutubePlayer>[0]) {
  const fake = createFakeYoutubeApi();
  vi.mocked(loadYoutubeIframeApi).mockResolvedValue(fake.YT);
  const view = renderHook(() => useYoutubePlayer(options));

  // The real container div only exists once something renders it — the
  // hook's effect bails out (no player created) without a mounted ref.
  const div = document.createElement('div');
  act(() => {
    // Assigning a RefObject's .current directly is normally React's job
    // via the `ref` JSX attribute — done by hand here since this test
    // renders the hook alone, with no real container element.
    view.result.current.containerRef.current = div;
  });

  await waitFor(() => expect(loadYoutubeIframeApi).toHaveBeenCalled());
  act(() => fake.simulateReady());
  await waitFor(() => expect(view.result.current.isReady).toBe(true));

  return { view, fake };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useYoutubePlayer', () => {
  it('never loads the IFrame API script when enabled is false', () => {
    renderHook(() => useYoutubePlayer({ youtubeVideoId: 'abc123', enabled: false }));
    expect(loadYoutubeIframeApi).not.toHaveBeenCalled();
  });

  it('passes the resume position as playerVars.start, once, at creation', async () => {
    const { fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123', startSeconds: 142.9 });
    expect(fake.getInstance()?.options.playerVars?.start).toBe(142);
  });

  it('plays when not playing and pauses when playing', async () => {
    const { view, fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123' });

    act(() => view.result.current.togglePlay());
    expect(fake.getInstance()?.playVideo).toHaveBeenCalledOnce();

    act(() => fake.simulateStateChange(fake.YT.PlayerState.PLAYING));
    await waitFor(() => expect(view.result.current.isPlaying).toBe(true));

    act(() => view.result.current.togglePlay());
    expect(fake.getInstance()?.pauseVideo).toHaveBeenCalledOnce();
  });

  it('seeks relative to the current position', async () => {
    const { view, fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123' });
    fake.setCurrentTime(100);

    act(() => view.result.current.seekBy(-5));

    expect(fake.getInstance()?.seekTo).toHaveBeenCalledWith(95, true);
  });

  it('toggles mute', async () => {
    const { view, fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123' });

    act(() => view.result.current.toggleMute());
    expect(fake.getInstance()?.mute).toHaveBeenCalledOnce();
    expect(view.result.current.isMuted).toBe(true);

    act(() => view.result.current.toggleMute());
    expect(fake.getInstance()?.unMute).toHaveBeenCalledOnce();
    expect(view.result.current.isMuted).toBe(false);
  });

  it('reports progress periodically while playing, and stops when paused', async () => {
    const onProgress = vi.fn();
    const { fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123', onProgress });
    fake.setCurrentTime(50);
    fake.setDuration(1000);

    act(() => fake.simulateStateChange(fake.YT.PlayerState.PLAYING));
    expect(onProgress).not.toHaveBeenCalled(); // not yet — only on the interval or on pause

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onProgress).toHaveBeenCalledWith(50, 1000);

    onProgress.mockClear();
    act(() => fake.simulateStateChange(fake.YT.PlayerState.PAUSED));
    expect(onProgress).toHaveBeenCalledOnce(); // one immediate flush on pause

    onProgress.mockClear();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onProgress).not.toHaveBeenCalled(); // the interval stopped when paused
  });

  it('calls onEnded with the duration when the video finishes', async () => {
    const onEnded = vi.fn();
    const { fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123', onEnded });
    fake.setDuration(933);

    act(() => fake.simulateStateChange(fake.YT.PlayerState.ENDED));

    expect(onEnded).toHaveBeenCalledWith(933);
  });

  it('sets hasError when the player reports an error', async () => {
    const { view, fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123' });
    act(() => fake.simulateError());
    expect(view.result.current.hasError).toBe(true);
  });

  it('destroys the player and flushes one last progress report on unmount', async () => {
    const onProgress = vi.fn();
    const { view, fake } = await setUpReadyPlayer({ youtubeVideoId: 'abc123', onProgress });
    fake.setCurrentTime(77);

    view.unmount();

    expect(fake.getInstance()?.destroy).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith(77, 1000);
  });
});

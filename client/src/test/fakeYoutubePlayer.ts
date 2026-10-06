import { vi } from 'vitest';

/**
 * A fake implementation of the bits of the YouTube IFrame Player API
 * this codebase actually uses, for testing useYoutubePlayer without a
 * real browser-loaded script (impossible in jsdom, and there's no
 * network path to youtube.com in this project's test environment
 * anyway — see docs/12-video-player's testing section).
 *
 * Mirrors the real API's shape closely enough that useYoutubePlayer
 * can't tell the difference: a `Player` class that stores the `events`
 * callbacks it's constructed with, plus `simulate*` methods tests use to
 * fire them — exactly what a human pressing play/pause, or YouTube's own
 * script reporting a state change, would trigger for real.
 */
export function createFakeYoutubeApi() {
  let instance: FakePlayerInstance | undefined;
  let currentTime = 0;
  let duration = 1000;
  let muted = false;

  interface FakePlayerInstance {
    playVideo: ReturnType<typeof vi.fn>;
    pauseVideo: ReturnType<typeof vi.fn>;
    seekTo: ReturnType<typeof vi.fn>;
    getCurrentTime: ReturnType<typeof vi.fn>;
    getDuration: ReturnType<typeof vi.fn>;
    mute: ReturnType<typeof vi.fn>;
    unMute: ReturnType<typeof vi.fn>;
    isMuted: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    options: YT.PlayerOptions;
  }

  class FakePlayer {
    playVideo = vi.fn();
    pauseVideo = vi.fn();
    seekTo = vi.fn((seconds: number) => {
      currentTime = seconds;
    });
    getCurrentTime = vi.fn(() => currentTime);
    getDuration = vi.fn(() => duration);
    mute = vi.fn(() => {
      muted = true;
    });
    unMute = vi.fn(() => {
      muted = false;
    });
    isMuted = vi.fn(() => muted);
    destroy = vi.fn();
    options: YT.PlayerOptions;

    constructor(_container: HTMLElement, options: YT.PlayerOptions) {
      this.options = options;
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- deliberate test-fixture capture (so getInstance() can return whichever instance the code under test constructed), not the this-binding confusion this rule exists to catch.
      instance = this;
    }
  }

  const PlayerState = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  } as const;

  return {
    YT: { Player: FakePlayer, PlayerState } as unknown as typeof YT,
    /** Fires the onReady callback the player was constructed with. */
    simulateReady: () =>
      instance?.options.events?.onReady?.({ target: instance as unknown as YT.Player }),
    /** Fires onStateChange with the given state (use PlayerState above). */
    simulateStateChange: (data: number) =>
      instance?.options.events?.onStateChange?.({ data, target: instance as unknown as YT.Player }),
    simulateError: () =>
      instance?.options.events?.onError?.({ data: 2, target: instance as unknown as YT.Player }),
    setCurrentTime: (seconds: number) => {
      currentTime = seconds;
    },
    setDuration: (seconds: number) => {
      duration = seconds;
    },
    getInstance: () => instance,
  };
}

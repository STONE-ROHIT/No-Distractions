import { useEffect, useRef, useState } from 'react';
import { loadYoutubeIframeApi } from '../lib/youtubeIframeApi';

/** How often a position update is sent to the server while playing. Not every tick — see docs/13-learning-features/progress-tracking.md for the throttling reasoning. */
const PROGRESS_SAVE_INTERVAL_MS = 10_000;
const SEEK_STEP_SECONDS = 5;

interface UseYoutubePlayerOptions {
  youtubeVideoId: string;
  /** Where to start playback — read once, at player creation; changing it later does not seek a running player. */
  startSeconds?: number;
  onProgress?: (currentTimeSeconds: number, durationSeconds: number) => void;
  onEnded?: (durationSeconds: number) => void;
  /**
   * Default true. Set false for a video known in advance to be
   * unplayable here (not embeddable) — skips loading the IFrame API
   * script entirely, rather than loading it and then discovering there's
   * no container to attach it to.
   */
  enabled?: boolean;
}

export interface YoutubePlayerControls {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  hasError: boolean;
  togglePlay: () => void;
  seekBy: (deltaSeconds: number) => void;
  toggleMute: () => void;
  requestFullscreen: () => void;
}

/**
 * Wraps YouTube's IFrame Player JS API — an imperative, globally-scripted,
 * callback-driven API that predates (and doesn't know about) React — as a
 * normal-feeling React hook. See docs/12-video-player for the full
 * explanation of why this needs to exist at all instead of the plain
 * iframe Phase 4 used.
 */
export function useYoutubePlayer(options: UseYoutubePlayerOptions): YoutubePlayerControls {
  const { youtubeVideoId, startSeconds } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest callbacks via refs, read inside event handlers — NOT in the
  // effect's dependency array. onProgress/onEnded are very likely to be a
  // fresh inline function on every parent render; depending on them
  // directly would tear down and recreate the player (losing playback
  // position) on every unrelated re-render of the page. The assignment
  // itself runs in an effect (after every render — no dependency array),
  // not the render body: writing a ref during render isn't safe (a
  // render can be discarded or run twice without committing).
  const onProgressRef = useRef(options.onProgress);
  const onEndedRef = useRef(options.onEnded);
  useEffect(() => {
    onProgressRef.current = options.onProgress;
    onEndedRef.current = options.onEnded;
  });

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }

    let cancelled = false;

    function stopProgressInterval() {
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    function reportProgress() {
      const player = playerRef.current;
      if (!player) return;
      onProgressRef.current?.(player.getCurrentTime(), player.getDuration());
    }

    loadYoutubeIframeApi().then((YTApi) => {
      if (cancelled || !containerRef.current) return;

      playerRef.current = new YTApi.Player(containerRef.current, {
        videoId: youtubeVideoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          start: Math.max(0, Math.floor(startSeconds ?? 0)),
        },
        events: {
          onReady: () => setIsReady(true),
          onError: () => setHasError(true),
          onStateChange: (event: YT.OnStateChangeEvent) => {
            const playing = event.data === YTApi.PlayerState.PLAYING;
            setIsPlaying(playing);

            if (playing) {
              stopProgressInterval();
              progressIntervalRef.current = setInterval(reportProgress, PROGRESS_SAVE_INTERVAL_MS);
            } else {
              stopProgressInterval();
            }

            if (event.data === YTApi.PlayerState.PAUSED) {
              reportProgress();
            } else if (event.data === YTApi.PlayerState.ENDED) {
              onEndedRef.current?.(playerRef.current?.getDuration() ?? 0);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopProgressInterval();
      // Best-effort final save — the position at the moment of navigating
      // away is worth capturing even though nothing waits for this call.
      reportProgress();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startSeconds is intentionally read once at creation (see the option's own doc comment), not tracked live.
  }, [youtubeVideoId, options.enabled]);

  return {
    containerRef,
    isReady,
    isPlaying,
    isMuted,
    hasError,
    togglePlay: () => {
      if (isPlaying) playerRef.current?.pauseVideo();
      else playerRef.current?.playVideo();
    },
    seekBy: (deltaSeconds: number) => {
      const player = playerRef.current;
      if (!player) return;
      player.seekTo(player.getCurrentTime() + deltaSeconds, true);
    },
    toggleMute: () => {
      const player = playerRef.current;
      if (!player) return;
      if (player.isMuted()) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    },
    requestFullscreen: () => {
      void containerRef.current?.parentElement?.requestFullscreen();
    },
  };
}

export { SEEK_STEP_SECONDS };

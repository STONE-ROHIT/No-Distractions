import { usePlayerKeyboardShortcuts } from '../hooks/usePlayerKeyboardShortcuts';
import { useYoutubePlayer } from '../hooks/useYoutubePlayer';

interface VideoPlayerProps {
  youtubeVideoId: string;
  title: string;
  embeddable: boolean;
  /** Where to resume — read once, at mount. See useYoutubePlayer's option of the same name. */
  startSeconds?: number;
  onProgress?: (currentTimeSeconds: number, durationSeconds: number) => void;
  onEnded?: (durationSeconds: number) => void;
}

/**
 * Plays through YouTube's own embedded player on the privacy-enhanced
 * youtube-nocookie.com domain — see ADR-005. Upgraded from Phase 4's
 * plain iframe to the full IFrame Player JS API (useYoutubePlayer) here
 * in Phase 5 specifically because progress tracking and keyboard
 * shortcuts both need to call methods on the player — getCurrentTime,
 * seekTo — which a bare iframe can't do.
 */
export function VideoPlayer({
  youtubeVideoId,
  title,
  embeddable,
  startSeconds,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  // Destructured here rather than used as `player.hasError` /
  // `player.containerRef` in JSX below — eslint's react-hooks/refs rule
  // flags ANY property access in JSX on an object that also carries a
  // ref (containerRef here), even an unrelated useState field like
  // hasError. Destructuring at the call site reads identically and
  // avoids the false positive.
  const { containerRef, isReady, hasError, togglePlay, seekBy, toggleMute, requestFullscreen } =
    useYoutubePlayer({
      youtubeVideoId,
      startSeconds,
      onProgress,
      onEnded,
      enabled: embeddable,
    });

  usePlayerKeyboardShortcuts(
    { togglePlay, seekBy, toggleMute, requestFullscreen },
    embeddable && isReady,
  );

  if (!embeddable) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg bg-wash p-6 text-center">
        <p className="text-sm text-ink-muted">
          This video&apos;s creator has disabled embedding, so it can&apos;t play here.
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-ink underline underline-offset-2"
        >
          Watch on YouTube
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="region"
        aria-label={`Video player: ${title}`}
        className="relative aspect-video overflow-hidden rounded-lg bg-black"
      >
        {/* The IFrame API replaces this div's contents with its own
            iframe once the player is created — see useYoutubePlayer. */}
        <div ref={containerRef} className="h-full w-full" />

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-wash p-6 text-center">
            <p className="text-sm text-ink-muted">This video couldn&apos;t be played.</p>
            <a
              href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-ink underline underline-offset-2"
            >
              Try it on YouTube
            </a>
          </div>
        )}
      </div>
      <p className="text-xs text-ink-muted">
        <kbd className="rounded border border-rule px-1">Space</kbd> play/pause ·{' '}
        <kbd className="rounded border border-rule px-1">←</kbd>/
        <kbd className="rounded border border-rule px-1">→</kbd> seek ·{' '}
        <kbd className="rounded border border-rule px-1">M</kbd> mute ·{' '}
        <kbd className="rounded border border-rule px-1">F</kbd> fullscreen
      </p>
    </div>
  );
}

interface VideoPlayerProps {
  youtubeVideoId: string;
  title: string;
  embeddable: boolean;
}

/**
 * Plays through YouTube's own embedded player on the privacy-enhanced
 * youtube-nocookie.com domain (Google's own recommended embed host for
 * exactly this: no tracking cookie is set until the visitor actually
 * presses play) — see ADR-005 for the full reasoning, including what
 * `rel=0` does and doesn't do.
 *
 * Deliberately a plain iframe for Phase 4 — no JS control over playback
 * yet. Phase 5 replaces this with the IFrame Player JS API specifically
 * because progress tracking and keyboard shortcuts need to call methods
 * on the player (getCurrentTime, seekTo, ...), which a bare iframe can't
 * do.
 */
export function VideoPlayer({ youtubeVideoId, title, embeddable }: VideoPlayerProps) {
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
    <div className="aspect-video overflow-hidden rounded-lg bg-black">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

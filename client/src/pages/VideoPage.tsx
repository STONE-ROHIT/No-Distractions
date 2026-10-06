import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { VideoPlayer } from '../features/videos/components/VideoPlayer';
import { useVideo } from '../features/videos/hooks/useVideo';
import { useProgress } from '../features/progress/hooks/useProgress';
import { useSaveProgress } from '../features/progress/hooks/useSaveProgress';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface Playback {
  positionSeconds: number;
  durationSeconds: number;
}

export function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const videoQuery = useVideo(videoId);
  const progressQuery = useProgress(videoId);
  const saveProgress = useSaveProgress(videoId ?? '');
  useDocumentTitle(videoQuery.data?.title);

  // Live display state, seeded from the initial progress fetch and from
  // then on updated directly by the player's callbacks — NOT by re-
  // reading progressQuery, which would make the resume position passed
  // to VideoPlayer drift as autosaves land. See
  // features/progress/README.md.
  const [liveProgress, setLiveProgress] = useState<{
    percentage: number;
    completed: boolean;
  } | null>(null);
  // The most recent position/duration the player has actually reported,
  // for the "Mark complete" button to save against — it only updates on
  // a progress callback (every ~10s, or on pause/end), so this can still
  // be stale by a few seconds, and starts at {0,0} until the first one
  // fires.
  const latestPlaybackRef = useRef<Playback>({ positionSeconds: 0, durationSeconds: 0 });

  const isLoading = videoQuery.isLoading || progressQuery.isLoading;

  function handleProgress(positionSeconds: number, durationSeconds: number) {
    latestPlaybackRef.current = { positionSeconds, durationSeconds };
    const percentage =
      durationSeconds > 0
        ? Math.min(100, Math.round((positionSeconds / durationSeconds) * 100))
        : 0;
    setLiveProgress({ percentage, completed: false });
    saveProgress.mutate({ positionSeconds, durationSeconds });
  }

  function handleEnded(durationSeconds: number) {
    latestPlaybackRef.current = { positionSeconds: durationSeconds, durationSeconds };
    setLiveProgress({ percentage: 100, completed: true });
    saveProgress.mutate({ positionSeconds: durationSeconds, durationSeconds, completed: true });
  }

  function handleToggleComplete() {
    const next = !displayedCompleted;
    // Fall back to the last SAVED position if the player hasn't reported
    // any playback yet (e.g. clicking this immediately, before the first
    // progress callback) rather than saving a bare {0, 0}.
    const playback =
      latestPlaybackRef.current.durationSeconds > 0
        ? latestPlaybackRef.current
        : {
            positionSeconds: progressQuery.data?.positionSeconds ?? 0,
            durationSeconds: progressQuery.data?.durationSeconds ?? 0,
          };
    setLiveProgress({ percentage: displayedPercentage, completed: next });
    saveProgress.mutate({ ...playback, completed: next });
  }

  if (isLoading) {
    return (
      <div
        role="status"
        className="aspect-video animate-pulse rounded-lg bg-wash"
        aria-label="Loading video"
      />
    );
  }

  if (videoQuery.isError) {
    const notFound = isAxiosError(videoQuery.error) && videoQuery.error.response?.status === 404;
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-rule-strong p-6">
        <p className="font-serif text-lg text-ink">
          {notFound ? 'Video not found' : 'Something went wrong'}
        </p>
        <p className="text-sm text-ink-muted">
          {notFound
            ? "This video isn't in your library, or the link is wrong."
            : "Couldn't load this video. Please try again."}
        </p>
        <Link to="/library" className="text-sm font-medium text-ink underline underline-offset-2">
          Back to library
        </Link>
      </div>
    );
  }

  const video = videoQuery.data;
  if (!video) {
    return null; // Same unreachable-in-practice guard as the loading/error checks above — satisfies the type checker.
  }

  const displayedPercentage = liveProgress?.percentage ?? progressQuery.data?.percentage ?? 0;
  const displayedCompleted = liveProgress?.completed ?? progressQuery.data?.completed ?? false;

  return (
    <div className="flex flex-col gap-4">
      <VideoPlayer
        youtubeVideoId={video.youtubeVideoId}
        title={video.title}
        embeddable={video.embeddable}
        startSeconds={progressQuery.data?.positionSeconds}
        onProgress={handleProgress}
        onEnded={handleEnded}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-xl text-ink">{video.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{video.channelTitle}</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleToggleComplete}
          isLoading={saveProgress.isPending}
        >
          {displayedCompleted ? 'Mark incomplete' : 'Mark complete'}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-wash"
          role="progressbar"
          aria-valuenow={displayedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-marker"
            style={{ width: `${displayedPercentage}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-ink-muted">
          {displayedCompleted ? 'Completed' : `${displayedPercentage}% watched`}
        </span>
      </div>

      {/* Notes and bookmarks (Phase 6) land in this space next. */}
    </div>
  );
}

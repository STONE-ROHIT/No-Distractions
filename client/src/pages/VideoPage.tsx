import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { VideoPlayer } from '../features/videos/components/VideoPlayer';
import { useVideo } from '../features/videos/hooks/useVideo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { data: video, isLoading, isError, error } = useVideo(videoId);
  useDocumentTitle(video?.title);

  if (isLoading) {
    return (
      <div
        role="status"
        className="aspect-video animate-pulse rounded-lg bg-wash"
        aria-label="Loading video"
      />
    );
  }

  if (isError) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
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

  if (!video) {
    // Reachable only between isLoading/isError both going false and data
    // actually arriving — isLoading/isError aren't type-narrowed to
    // guarantee `data` is defined, so this satisfies the type checker and
    // renders nothing for that instant rather than crashing.
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <VideoPlayer
        youtubeVideoId={video.youtubeVideoId}
        title={video.title}
        embeddable={video.embeddable}
      />
      <div>
        <h1 className="font-serif text-xl text-ink">{video.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{video.channelTitle}</p>
      </div>
      {/* Notes, bookmarks, progress tracking, and the Save/Bookmark/Mark
          Complete actions from the product spec's video-page mockup all
          land in Phases 5–6 — nothing here yet to avoid a row of buttons
          that don't do anything. */}
    </div>
  );
}

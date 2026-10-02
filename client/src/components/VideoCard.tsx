import { Link } from 'react-router-dom';
import type { Video } from '../types/video';

interface VideoCardProps {
  video: Video;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link
      to={`/videos/${video.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-rule bg-surface"
    >
      <div className="relative aspect-video bg-wash">
        <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="line-clamp-2 text-sm font-medium text-ink group-hover:underline">
          {video.title}
        </p>
        <p className="text-xs text-ink-muted">{video.channelTitle}</p>
      </div>
    </Link>
  );
}

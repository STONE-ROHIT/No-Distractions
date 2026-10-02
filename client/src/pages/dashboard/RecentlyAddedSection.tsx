import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { useLibrary } from '../../features/library/hooks/useLibrary';
import { DashboardSection } from './DashboardSection';

export function RecentlyAddedSection() {
  const { data: items, isLoading } = useLibrary();

  return (
    <DashboardSection title="Recently added">
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading recently added"
          className="h-24 animate-pulse rounded-lg bg-wash"
        />
      ) : items && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.slice(0, 3).map(({ video, savedAt }) => (
            <li key={video.id}>
              <Link to={`/videos/${video.id}`} className="flex items-center gap-3 hover:underline">
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  className="h-10 w-16 shrink-0 rounded object-cover"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-ink">{video.title}</span>
                  <span className="text-xs text-ink-muted">
                    {new Date(savedAt).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nothing added yet"
          description="The last few videos and playlists you save will appear here."
        />
      )}
    </DashboardSection>
  );
}

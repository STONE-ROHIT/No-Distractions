import { Link } from 'react-router-dom';
import { buttonClassName } from '../../components/button-styles';
import { EmptyState } from '../../components/EmptyState';
import { useLibrary } from '../../features/library/hooks/useLibrary';
import { DashboardSection } from './DashboardSection';

export function MyLibrarySection() {
  const { data: items, isLoading } = useLibrary();

  return (
    <DashboardSection title="My library">
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading library"
          className="h-24 animate-pulse rounded-lg bg-wash"
        />
      ) : items && items.length > 0 ? (
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {items.slice(0, 4).map(({ video }) => (
              <img
                key={video.id}
                src={video.thumbnailUrl}
                alt=""
                className="size-12 rounded-md border-2 border-surface object-cover"
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-ink">
              {items.length} {items.length === 1 ? 'video' : 'videos'} saved
            </p>
            <Link
              to="/library"
              className="text-sm font-medium text-ink underline underline-offset-2"
            >
              Open library
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Your library is empty"
          description="Paste a YouTube link above to import your first video."
          action={
            <Link to="/library" className={buttonClassName('secondary')}>
              Open library
            </Link>
          }
        />
      )}
    </DashboardSection>
  );
}

import { EmptyState } from '../components/EmptyState';
import { VideoCard } from '../components/VideoCard';
import { useLibrary } from '../features/library/hooks/useLibrary';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// A real (if basic) list of saved videos now that Phase 4 gives it
// something to show. Filtering, search, and saved-playlist grouping are
// Phase 8 — see features/library/README.md.
export function LibraryPage() {
  useDocumentTitle('Library');
  const { data: items, isLoading } = useLibrary();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink">Library</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              role="status"
              aria-label="Loading library"
              className="aspect-video animate-pulse rounded-lg bg-wash"
            />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ video }) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your library is empty"
          description="Paste a YouTube link on your dashboard to import your first video."
        />
      )}
    </div>
  );
}

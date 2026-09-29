import { EmptyState } from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Full library UI (filters, search, saved videos/playlists) is Phase 8 —
// this placeholder exists so the sidebar's Library link goes somewhere,
// rather than 404ing.
export function LibraryPage() {
  useDocumentTitle('Library');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink">Library</h1>
      <EmptyState
        title="Coming in Phase 8"
        description="Saved videos and playlists, with filters for in-progress, completed, and bookmarked."
      />
    </div>
  );
}

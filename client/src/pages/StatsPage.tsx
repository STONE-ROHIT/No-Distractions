import { EmptyState } from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Full statistics page is Phase 9 — placeholder so the sidebar's
// Statistics link goes somewhere, rather than 404ing.
export function StatsPage() {
  useDocumentTitle('Statistics');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink">Statistics</h1>
      <EmptyState
        title="Coming in Phase 9"
        description="Total learning time, completed videos, playlists finished, and your current streak."
      />
    </div>
  );
}

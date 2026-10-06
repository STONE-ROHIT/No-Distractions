import { EmptyState } from '../../components/EmptyState';
import { useContinueLearning } from '../../features/progress/hooks/useContinueLearning';
import { DashboardSection } from './DashboardSection';

// A small, honest increment for Phase 5: how many videos are currently
// in progress, reusing the same query Continue Learning already fetches
// (TanStack Query dedupes the request). Total learning time, completed
// count, and streak need more than this — they're Phase 9's job.
export function ProgressSection() {
  const { data: items, isLoading } = useContinueLearning();

  return (
    <DashboardSection title="Progress">
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading progress"
          className="h-24 animate-pulse rounded-lg bg-wash"
        />
      ) : items && items.length > 0 ? (
        <p className="text-sm text-ink">
          {items.length} {items.length === 1 ? 'video' : 'videos'} in progress
        </p>
      ) : (
        <EmptyState
          title="No stats yet"
          description="Videos completed, time spent learning, and your streak will show up here."
        />
      )}
    </DashboardSection>
  );
}

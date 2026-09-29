import { EmptyState } from '../../components/EmptyState';
import { DashboardSection } from './DashboardSection';

// Total learning time / completed count / streak — depends on
// WatchProgress existing (Phase 5) and the stats aggregation (Phase 9).
export function ProgressSection() {
  return (
    <DashboardSection title="Progress">
      <EmptyState
        title="No stats yet"
        description="Videos completed, time spent learning, and your streak will show up here."
      />
    </DashboardSection>
  );
}

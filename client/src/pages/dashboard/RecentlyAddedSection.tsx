import { EmptyState } from '../../components/EmptyState';
import { DashboardSection } from './DashboardSection';

export function RecentlyAddedSection() {
  return (
    <DashboardSection title="Recently added">
      <EmptyState
        title="Nothing added yet"
        description="The last few videos and playlists you save will appear here."
      />
    </DashboardSection>
  );
}

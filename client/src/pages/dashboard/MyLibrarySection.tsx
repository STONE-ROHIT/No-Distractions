import { Link } from 'react-router-dom';
import { buttonClassName } from '../../components/button-styles';
import { EmptyState } from '../../components/EmptyState';
import { DashboardSection } from './DashboardSection';

export function MyLibrarySection() {
  return (
    <DashboardSection title="My library">
      <EmptyState
        title="Your library is empty"
        description="Saved videos and playlists will show up here once importing exists (Phase 4)."
        action={
          <Link to="/library" className={buttonClassName('secondary')}>
            Open library
          </Link>
        }
      />
    </DashboardSection>
  );
}

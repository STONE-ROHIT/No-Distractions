import { ImportVideoForm } from '../features/videos/components/ImportVideoForm';
import { useAuth } from '../context/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContinueLearningSection } from './dashboard/ContinueLearningSection';
import { MyLibrarySection } from './dashboard/MyLibrarySection';
import { ProgressSection } from './dashboard/ProgressSection';
import { RecentlyAddedSection } from './dashboard/RecentlyAddedSection';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-2xl text-ink">
          {firstName ? `Welcome back, ${firstName}.` : 'Dashboard'}
        </h1>
        <div className="rounded-lg border border-rule bg-surface p-4">
          <ImportVideoForm />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ContinueLearningSection />
        <MyLibrarySection />
        <RecentlyAddedSection />
        <ProgressSection />
      </div>
    </div>
  );
}

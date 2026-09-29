import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PublicHeader } from '../layouts/PublicHeader';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-2xl text-ink">Page not found</h1>
        <Link to="/" className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink">
          Back to No Distractions
        </Link>
      </main>
    </div>
  );
}

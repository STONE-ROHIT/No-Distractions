import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-neutral-100">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-sm text-neutral-400 underline underline-offset-2">
        Back to No Distractions
      </Link>
    </main>
  );
}

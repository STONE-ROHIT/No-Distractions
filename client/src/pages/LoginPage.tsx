import { Link } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PublicHeader } from '../layouts/PublicHeader';

export function LoginPage() {
  useDocumentTitle('Log in');

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl text-ink">Log in</h1>
            <p className="mt-1 text-sm text-ink-muted">Welcome back to No Distractions.</p>
          </div>
          <LoginForm />
          <p className="text-center text-sm text-ink-muted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-ink underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PublicHeader } from '../layouts/PublicHeader';

export function RegisterPage() {
  useDocumentTitle('Sign up');

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl text-ink">Create your account</h1>
            <p className="mt-1 text-sm text-ink-muted">Start learning, distraction-free.</p>
          </div>
          <RegisterForm />
          <p className="text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-ink underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-neutral-100">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Log in</h1>
          <p className="mt-1 text-sm text-neutral-400">Welcome back to No Distractions.</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-neutral-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-neutral-100 underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

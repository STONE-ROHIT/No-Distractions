import { Link } from 'react-router-dom';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-neutral-100">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-neutral-400">Start learning, distraction-free.</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-neutral-400">
          Already have an account?{' '}
          <Link to="/login" className="text-neutral-100 underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

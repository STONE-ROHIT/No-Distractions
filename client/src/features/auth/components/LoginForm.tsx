import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../../../api/auth';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { authMeQueryKey } from '../../../context/auth-context';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(authMeQueryKey, user);
      navigate('/dashboard');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  // The backend deliberately returns the same message for "unknown email"
  // and "wrong password" (see server/src/services/auth.service.ts) — this
  // just displays whatever it sent rather than trying to be more specific.
  const errorMessage = isAxiosError(mutation.error)
    ? ((mutation.error.response?.data as { error?: { message?: string } } | undefined)?.error
        ?.message ?? 'Something went wrong. Please try again.')
    : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}
      <Button type="submit" isLoading={mutation.isPending}>
        Log in
      </Button>
    </form>
  );
}

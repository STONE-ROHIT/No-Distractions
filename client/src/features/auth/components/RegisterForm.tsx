import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerRequest } from '../../../api/auth';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { authMeQueryKey } from '../../../context/auth-context';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(authMeQueryKey, user);
      navigate('/dashboard');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ name, email, password });
  }

  const errorMessage = isAxiosError(mutation.error)
    ? ((mutation.error.response?.data as { error?: { message?: string } } | undefined)?.error
        ?.message ?? 'Something went wrong. Please try again.')
    : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <TextField
        label="Name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}
      <Button type="submit" isLoading={mutation.isPending}>
        Create account
      </Button>
    </form>
  );
}

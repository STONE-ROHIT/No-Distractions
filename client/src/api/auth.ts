import type { User } from '../types/user';
import { apiClient } from './client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function registerRequest(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>('/auth/register', payload);
  return data.user;
}

export async function loginRequest(payload: LoginPayload): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>('/auth/login', payload);
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/users/me');
  return data.user;
}

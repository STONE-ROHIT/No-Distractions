import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import { AppError } from '../middleware/errorHandler.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validators.js';

// Every handler here is `async` with no try/catch: Express 5 forwards a
// rejected promise to the centralized error handler automatically (see
// middleware/errorHandler.ts), so a thrown AppError from the service layer
// (invalid credentials, duplicate email, ...) turns into the right HTTP
// response with no boilerplate at the call site.

export async function register(req: Request, res: Response): Promise<void> {
  const { user, accessToken, refreshToken } = await authService.register(req.body as RegisterInput);
  setAuthCookies(res, { accessToken, refreshToken });
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, accessToken, refreshToken } = await authService.login(req.body as LoginInput);
  setAuthCookies(res, { accessToken, refreshToken });
  res.status(200).json({ user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw: unknown = req.cookies[REFRESH_TOKEN_COOKIE];
  if (typeof raw !== 'string') {
    throw new AppError(401, 'Not authenticated');
  }

  const { user, accessToken, refreshToken } = await authService.refresh(raw);
  setAuthCookies(res, { accessToken, refreshToken });
  res.status(200).json({ user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const raw: unknown = req.cookies[REFRESH_TOKEN_COOKIE];
  await authService.logout(typeof raw === 'string' ? raw : undefined);
  clearAuthCookies(res);
  res.status(204).send();
}

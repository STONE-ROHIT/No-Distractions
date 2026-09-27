import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  // req.userId is guaranteed set here: this handler only ever runs after
  // requireAuth on the route (see routes/users.routes.ts).
  if (!req.userId) {
    throw new AppError(401, 'Not authenticated');
  }
  const user = await userService.getCurrentUser(req.userId);
  res.status(200).json({ user });
}

import type { Request, Response } from 'express';
import * as libraryService from '../services/library.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { Types } from 'mongoose';

export async function listLibrary(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, 'Not authenticated');
  const items = await libraryService.getLibraryForUser(new Types.ObjectId(req.userId));
  res.status(200).json({ items });
}

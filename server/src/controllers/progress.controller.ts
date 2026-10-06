import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import * as progressService from '../services/progress.service.js';
import type { SaveProgressInput } from '../validators/progress.validators.js';

export async function saveProgress(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, 'Not authenticated');
  const progress = await progressService.saveProgress(
    new Types.ObjectId(req.userId),
    req.params.videoId as string,
    req.body as SaveProgressInput,
  );
  res.status(200).json({ progress });
}

export async function getProgress(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, 'Not authenticated');
  const progress = await progressService.getProgress(
    new Types.ObjectId(req.userId),
    req.params.videoId as string,
  );
  res.status(200).json({ progress });
}

export async function listInProgress(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, 'Not authenticated');
  const items = await progressService.getContinueLearning(new Types.ObjectId(req.userId));
  res.status(200).json({ items });
}

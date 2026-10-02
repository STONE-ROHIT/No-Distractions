import type { Request, Response } from 'express';
import * as videoService from '../services/video.service.js';
import { AppError } from '../middleware/errorHandler.js';
import type { ImportVideoInput } from '../validators/video.validators.js';
import { Types } from 'mongoose';

export async function importVideo(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw new AppError(401, 'Not authenticated');
  const { url } = req.body as ImportVideoInput;
  const result = await videoService.importFromUrl(url, new Types.ObjectId(req.userId));
  res.status(201).json(result);
}

export async function getVideo(req: Request, res: Response): Promise<void> {
  const video = await videoService.getVideoById(req.params.id as string);
  res.status(200).json({ video });
}

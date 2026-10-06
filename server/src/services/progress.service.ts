import { Types } from 'mongoose';
import { COMPLETION_THRESHOLD_PERCENT } from '../models/WatchProgress.js';
import { AppError } from '../middleware/errorHandler.js';
import * as videoRepository from '../repositories/video.repository.js';
import * as watchProgressRepository from '../repositories/watchProgress.repository.js';
import { toPublicVideo } from './video.service.js';
import type { Types as MongooseTypes } from 'mongoose';

interface SaveProgressInput {
  positionSeconds: number;
  durationSeconds: number;
  /** Explicit override from the "Mark complete" / "Mark incomplete" button; omitted for an ordinary periodic autosave, which is judged by percentage instead. */
  completed?: boolean;
}

interface ProgressLike {
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  completed: boolean;
  lastWatchedAt: Date;
}

function toPublicProgress(progress: ProgressLike) {
  return {
    positionSeconds: progress.positionSeconds,
    durationSeconds: progress.durationSeconds,
    percentage: progress.percentage,
    completed: progress.completed,
    lastWatchedAt: progress.lastWatchedAt,
  };
}

function assertValidVideoId(videoId: string): void {
  if (!Types.ObjectId.isValid(videoId)) {
    throw new AppError(400, 'Invalid video id.');
  }
}

export async function saveProgress(
  userId: MongooseTypes.ObjectId,
  videoId: string,
  input: SaveProgressInput,
) {
  assertValidVideoId(videoId);
  const video = await videoRepository.findVideoById(videoId);
  if (!video) {
    throw new AppError(404, 'Video not found.');
  }

  const percentage =
    input.durationSeconds > 0
      ? Math.min(100, Math.round((input.positionSeconds / input.durationSeconds) * 100))
      : 0;
  const completed = input.completed ?? percentage >= COMPLETION_THRESHOLD_PERCENT;

  const progress = await watchProgressRepository.upsertProgress(
    userId,
    new Types.ObjectId(videoId),
    {
      positionSeconds: input.positionSeconds,
      durationSeconds: input.durationSeconds,
      percentage,
      completed,
    },
  );
  return toPublicProgress(progress);
}

export async function getProgress(userId: MongooseTypes.ObjectId, videoId: string) {
  assertValidVideoId(videoId);
  const progress = await watchProgressRepository.findProgress(userId, new Types.ObjectId(videoId));
  return progress ? toPublicProgress(progress) : null;
}

export async function getContinueLearning(userId: MongooseTypes.ObjectId) {
  const items = await watchProgressRepository.findInProgressForUser(userId);
  return items.map((item) => ({
    ...toPublicProgress(item),
    // Same populate()-doesn't-change-the-static-type situation as
    // library.service.ts — see that file's comment.
    video: toPublicVideo(item.video as unknown as Parameters<typeof toPublicVideo>[0]),
  }));
}

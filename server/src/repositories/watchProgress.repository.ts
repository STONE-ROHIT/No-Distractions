import { WatchProgress } from '../models/WatchProgress.js';
import type { Types } from 'mongoose';

export interface SaveProgressFields {
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  completed: boolean;
}

export function upsertProgress(
  userId: Types.ObjectId,
  videoId: Types.ObjectId,
  fields: SaveProgressFields,
) {
  return WatchProgress.findOneAndUpdate(
    { user: userId, video: videoId },
    { $set: { ...fields, lastWatchedAt: new Date() } },
    { upsert: true, new: true },
  );
}

export function findProgress(userId: Types.ObjectId, videoId: Types.ObjectId) {
  return WatchProgress.findOne({ user: userId, video: videoId });
}

/** Powers "Continue Learning": watched some, not finished, most recent first. */
export function findInProgressForUser(userId: Types.ObjectId) {
  return WatchProgress.find({ user: userId, completed: false, percentage: { $gt: 0 } })
    .sort({ lastWatchedAt: -1 })
    .populate('video');
}

import { LibraryItem } from '../models/LibraryItem.js';
import type { Types } from 'mongoose';

/**
 * Idempotent on purpose: re-importing a video you've already saved (or a
 * playlist containing one) should not error and should not create a
 * second row — it's still just "this video is in your library".
 */
export async function addToLibrary(userId: Types.ObjectId, videoId: Types.ObjectId): Promise<void> {
  await LibraryItem.updateOne(
    { user: userId, video: videoId },
    { $setOnInsert: { savedAt: new Date() } },
    { upsert: true },
  );
}

/** Newest-saved first — this is what powers "Recently Added" on the dashboard. */
export function findLibraryByUser(userId: Types.ObjectId) {
  return LibraryItem.find({ user: userId }).sort({ savedAt: -1 }).populate('video');
}

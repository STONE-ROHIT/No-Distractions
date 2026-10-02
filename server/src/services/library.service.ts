import type { Types } from 'mongoose';
import * as libraryItemRepository from '../repositories/libraryItem.repository.js';
import { toPublicVideo } from './video.service.js';
import type { VideoDocument } from '../models/Video.js';

export async function getLibraryForUser(userId: Types.ObjectId) {
  const items = await libraryItemRepository.findLibraryByUser(userId);
  return items.map((item) => ({
    savedAt: item.savedAt,
    // .populate('video') replaces the ObjectId at runtime with the full
    // document, but doesn't change the field's static type to match —
    // this reflects what's actually there.
    video: toPublicVideo(item.video as unknown as VideoDocument & { _id: Types.ObjectId }),
  }));
}

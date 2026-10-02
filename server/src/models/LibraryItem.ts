import { Schema, model } from 'mongoose';

/**
 * "This video is in this user's library" — independent of watch progress
 * (Phase 5) and of playlist membership (Phase 7). See ADR-003 for why
 * this is its own collection rather than inferred from either of those.
 *
 * Currently created as a side effect of importing a video (Phase 4) —
 * there's no "browse without saving" yet (that's Search, later), so
 * import and save are the same action for now. Phase 8 builds the actual
 * library page (filters, sorting) on top of this; it doesn't change how
 * items get created here.
 */
const libraryItemSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  savedAt: { type: Date, default: Date.now },
});

libraryItemSchema.index({ user: 1, video: 1 }, { unique: true });

export const LibraryItem = model('LibraryItem', libraryItemSchema);

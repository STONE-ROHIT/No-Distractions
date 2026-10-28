import mongoose from 'mongoose'

/**
 * A bookmark marks a specific playback position the learner wants to
 * return to ("the step where the formula appears"), with a short label.
 *
 * Like notes, bookmarks are keyed by (user, videoId) rather than by a
 * LibraryItem: they work for unsaved videos and survive re-saving.
 * Unlike notes they hold no body text — just a position and a label —
 * which is why they are a separate collection instead of a "kind" field
 * on notes (different shape, different UI, same ownership pattern).
 */
const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    // Playback position the bookmark points at.
    positionSec: {
      type: Number,
      required: true,
      min: 0,
    },
    // Short human label ("Key insight", "Re-watch this proof", …).
    label: {
      type: String,
      trim: true,
      maxlength: [120, 'Labels must be at most 120 characters'],
      default: '',
    },
  },
  { timestamps: true },
)

// Fast lookup of "all bookmarks by this user for this video".
bookmarkSchema.index({ user: 1, videoId: 1 })

bookmarkSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Bookmark', bookmarkSchema)

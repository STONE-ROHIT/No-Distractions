import mongoose from 'mongoose'

/**
 * A LibraryItem is one user's relationship with one YouTube video.
 * It stores the saved video's metadata *and* the watch progress,
 * which keeps "saved videos" and "progress" in a single place
 * instead of duplicating data across two collections.
 */
const libraryItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The 11-character YouTube video id (e.g. "dQw4w9WgXcQ").
    videoId: {
      type: String,
      required: true,
    },
    title: { type: String, default: '' },
    channelName: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    // Total video length in seconds. Learned from the player while watching.
    durationSec: { type: Number, default: 0, min: 0 },
    // Where the user last stopped watching (for "resume").
    lastPositionSec: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: null },
    // Client clock (ms) of the newest accepted progress write. Progress
    // requests carry a `savedAt` timestamp; anything not newer than this
    // value is a duplicate or stale replay and is ignored. This makes
    // retries and offline-queue replays safe (idempotent).
    progressSavedAt: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// A user can save a given video only once.
libraryItemSchema.index({ user: 1, videoId: 1 }, { unique: true })

// Progress percentage (0-100), used by video cards and playlist progress.
libraryItemSchema.virtual('progressPercent').get(function () {
  if (this.completed) return 100
  if (!this.durationSec || !this.lastPositionSec) return 0
  return Math.min(100, Math.round((this.lastPositionSec / this.durationSec) * 100))
})

libraryItemSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('LibraryItem', libraryItemSchema)

import mongoose from 'mongoose'

/**
 * Notes are keyed by (user, videoId) rather than by a LibraryItem,
 * so users can take notes on a video even before saving it, and
 * notes survive removing and re-adding the video to the library.
 */
const noteSchema = new mongoose.Schema(
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
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [2000, 'A note must be at most 2000 characters'],
    },
    // Optional point in the video the note refers to.
    timestampSec: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
)

// Fast lookup of "all notes by this user for this video".
noteSchema.index({ user: 1, videoId: 1 })

noteSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Note', noteSchema)

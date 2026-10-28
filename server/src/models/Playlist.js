import mongoose from 'mongoose'

/**
 * A playlist groups videos the user has already saved to their library.
 * Each entry references a LibraryItem, so playlist progress can be
 * calculated from the completion status of those items.
 */
const playlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description must be at most 300 characters'],
      default: '',
    },
    items: [
      {
        libraryItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LibraryItem',
          required: true,
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

playlistSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Playlist', playlistSchema)

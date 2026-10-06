import { Schema, model } from 'mongoose';

/** Percentage watched at or above this counts as "completed" automatically. */
export const COMPLETION_THRESHOLD_PERCENT = 90;

const watchProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    positionSeconds: { type: Number, required: true, min: 0 },
    // A snapshot of the player's own reported duration at save time (not
    // Video.durationSeconds) — what the percentage is actually computed
    // against. See docs/13-learning-features/progress-tracking.md.
    durationSeconds: { type: Number, required: true, min: 0 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    completed: { type: Boolean, required: true, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

watchProgressSchema.index({ user: 1, video: 1 }, { unique: true });

export const WatchProgress = model('WatchProgress', watchProgressSchema);

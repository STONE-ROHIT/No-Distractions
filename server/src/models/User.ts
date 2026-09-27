import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // `select: false` means a plain `User.findOne(...)` never returns the
    // hash — callers that genuinely need it (login) must opt in with
    // `.select('+passwordHash')`. This makes "accidentally sending the
    // hash to the client" a much harder mistake to make.
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      autoplayNext: { type: Boolean, default: false },
      defaultPlaybackRate: { type: Number, default: 1 },
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);

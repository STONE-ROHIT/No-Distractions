import { Schema, model, type InferSchemaType } from 'mongoose';

const videoSchema = new Schema(
  {
    youtubeVideoId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    thumbnailUrl: { type: String, required: true },
    channelTitle: { type: String, required: true },
    channelId: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    // From the Data API's status.embeddable — some creators disable
    // embedding entirely. Checked before rendering the player rather than
    // discovered by a broken embed; see docs/11-youtube-integration.
    embeddable: { type: Boolean, required: true },
    publishedAt: { type: Date, required: true },
    lastMetadataRefresh: { type: Date, default: Date.now },
  },
  // Plain `timestamps: true`, not a custom-named createdAt: a custom
  // timestamp field name broke Mongoose's generated document type here
  // (fields — even _id — inferred as `unknown` at every call site), which
  // isn't worth fighting for a field-name preference. `createdAt` means
  // "first imported into the shared cache" for this collection.
  { timestamps: true },
);

export type VideoDocument = InferSchemaType<typeof videoSchema>;
export const Video = model('Video', videoSchema);

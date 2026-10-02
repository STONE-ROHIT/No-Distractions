import { Video } from '../models/Video.js';
import type { YoutubeApiVideo } from '../services/youtubeApi.js';
import { parseIso8601Duration } from '../utils/isoDuration.js';

function toVideoFields(apiVideo: YoutubeApiVideo) {
  const thumbnail =
    apiVideo.snippet.thumbnails.high ??
    apiVideo.snippet.thumbnails.medium ??
    apiVideo.snippet.thumbnails.default;

  return {
    title: apiVideo.snippet.title,
    description: apiVideo.snippet.description,
    thumbnailUrl: thumbnail?.url ?? '',
    channelTitle: apiVideo.snippet.channelTitle,
    channelId: apiVideo.snippet.channelId,
    durationSeconds: parseIso8601Duration(apiVideo.contentDetails.duration),
    embeddable: apiVideo.status.embeddable,
    publishedAt: new Date(apiVideo.snippet.publishedAt),
    lastMetadataRefresh: new Date(),
  };
}

/**
 * Insert-or-refresh by youtubeVideoId: a video already in the global
 * cache gets its metadata refreshed (a title/thumbnail can change after
 * the fact) rather than skipped or duplicated.
 */
export function upsertVideoFromApi(apiVideo: YoutubeApiVideo) {
  return Video.findOneAndUpdate(
    { youtubeVideoId: apiVideo.id },
    { $set: toVideoFields(apiVideo), $setOnInsert: { youtubeVideoId: apiVideo.id } },
    { upsert: true, new: true },
  );
}

export function findVideoById(id: string) {
  return Video.findById(id);
}

export function findVideosByIds(ids: string[]) {
  return Video.find({ _id: { $in: ids } });
}

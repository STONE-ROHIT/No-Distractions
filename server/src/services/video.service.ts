import type { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import * as libraryItemRepository from '../repositories/libraryItem.repository.js';
import * as videoRepository from '../repositories/video.repository.js';
import { parseYoutubeUrl } from '../utils/youtubeUrl.js';
import * as youtubeApi from './youtubeApi.js';
import { YoutubeApiError } from './youtubeApi.js';

/**
 * The fields toPublicVideo actually reads, rather than a precise Mongoose
 * HydratedDocument type. Accepting the minimal shape a function needs —
 * rather than "whatever type this specific query method returns" — means
 * it works the same whether the document came from findById,
 * findOneAndUpdate, or a populated reference on another collection,
 * without re-deriving Mongoose's exact generic result at every call site.
 */
interface VideoLike {
  _id: Types.ObjectId | string;
  youtubeVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  durationSeconds: number;
  embeddable: boolean;
  publishedAt: Date;
}

export function toPublicVideo(video: VideoLike) {
  return {
    id: video._id.toString(),
    youtubeVideoId: video.youtubeVideoId,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    channelTitle: video.channelTitle,
    durationSeconds: video.durationSeconds,
    embeddable: video.embeddable,
    publishedAt: video.publishedAt,
  };
}

export type ImportResult =
  | { type: 'video'; video: ReturnType<typeof toPublicVideo> }
  | { type: 'playlist'; playlistTitle: string; videos: ReturnType<typeof toPublicVideo>[] };

/** Translates the YouTube API client's small error-reason set into the right HTTP status for the rest of the app. */
function rethrowAsAppError(error: unknown): never {
  if (error instanceof YoutubeApiError) {
    if (error.reason === 'quotaExceeded') throw new AppError(503, error.message);
    throw new AppError(502, 'Could not reach YouTube. Please try again shortly.');
  }
  throw error;
}

async function importVideos(videoIds: string[], userId: Types.ObjectId) {
  const apiVideos = await youtubeApi.fetchVideosByIds(videoIds);
  const videos = [];
  for (const apiVideo of apiVideos) {
    const video = await videoRepository.upsertVideoFromApi(apiVideo);
    await libraryItemRepository.addToLibrary(userId, video._id);
    videos.push(toPublicVideo(video));
  }
  return videos;
}

export async function importFromUrl(url: string, userId: Types.ObjectId): Promise<ImportResult> {
  const parsed = parseYoutubeUrl(url);

  if (!parsed) {
    throw new AppError(400, 'Enter a valid YouTube video or playlist URL.');
  }
  if (parsed.type === 'shorts') {
    throw new AppError(
      400,
      "No Distractions doesn't import Shorts — paste a regular video or playlist link.",
    );
  }

  try {
    if (parsed.type === 'video') {
      const videos = await importVideos([parsed.videoId], userId);
      if (videos.length === 0) {
        throw new AppError(404, 'This video is unavailable or private.');
      }
      return { type: 'video', video: videos[0]! };
    }

    // parsed.type === 'playlist'
    const playlist = await youtubeApi.fetchPlaylistById(parsed.playlistId);
    if (!playlist) {
      throw new AppError(404, 'This playlist is unavailable or private.');
    }
    const videoIds = await youtubeApi.fetchPlaylistVideoIds(parsed.playlistId);
    if (videoIds.length === 0) {
      throw new AppError(404, 'This playlist has no videos.');
    }
    const videos = await importVideos(videoIds, userId);
    return { type: 'playlist', playlistTitle: playlist.snippet.title, videos };
  } catch (error) {
    if (error instanceof AppError) throw error;
    return rethrowAsAppError(error);
  }
}

export async function getVideoById(id: string) {
  const video = await videoRepository.findVideoById(id);
  if (!video) {
    throw new AppError(404, 'Video not found.');
  }
  return toPublicVideo(video);
}

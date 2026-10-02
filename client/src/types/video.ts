export interface Video {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  durationSeconds: number;
  embeddable: boolean;
  publishedAt: string;
}

export interface LibraryEntry {
  savedAt: string;
  video: Video;
}

export type ImportResult =
  { type: 'video'; video: Video } | { type: 'playlist'; playlistTitle: string; videos: Video[] };

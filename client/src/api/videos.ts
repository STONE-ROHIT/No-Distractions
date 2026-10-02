import type { ImportResult, Video } from '../types/video';
import { apiClient } from './client';

export async function importVideoRequest(url: string): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/videos/import', { url });
  return data;
}

export async function fetchVideoRequest(id: string): Promise<Video> {
  const { data } = await apiClient.get<{ video: Video }>(`/videos/${id}`);
  return data.video;
}

import type { ContinueLearningEntry, WatchProgress } from '../types/progress';
import { apiClient } from './client';

export interface SaveProgressPayload {
  positionSeconds: number;
  durationSeconds: number;
  completed?: boolean;
}

export async function saveProgressRequest(
  videoId: string,
  payload: SaveProgressPayload,
): Promise<WatchProgress> {
  const { data } = await apiClient.put<{ progress: WatchProgress }>(
    `/progress/${videoId}`,
    payload,
  );
  return data.progress;
}

export async function fetchProgressRequest(videoId: string): Promise<WatchProgress | null> {
  const { data } = await apiClient.get<{ progress: WatchProgress | null }>(`/progress/${videoId}`);
  return data.progress;
}

export async function fetchContinueLearningRequest(): Promise<ContinueLearningEntry[]> {
  const { data } = await apiClient.get<{ items: ContinueLearningEntry[] }>('/progress');
  return data.items;
}

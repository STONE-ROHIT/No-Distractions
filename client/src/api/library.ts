import type { LibraryEntry } from '../types/video';
import { apiClient } from './client';

export async function fetchLibraryRequest(): Promise<LibraryEntry[]> {
  const { data } = await apiClient.get<{ items: LibraryEntry[] }>('/library');
  return data.items;
}

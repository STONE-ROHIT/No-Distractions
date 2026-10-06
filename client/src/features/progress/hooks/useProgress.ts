import { useQuery } from '@tanstack/react-query';
import { fetchProgressRequest } from '../../../api/progress';

export function progressQueryKey(videoId: string) {
  return ['progress', videoId] as const;
}

/** The caller's saved progress for one video — null (not an error) if they've never watched it. */
export function useProgress(videoId: string | undefined) {
  return useQuery({
    queryKey: progressQueryKey(videoId ?? ''),
    queryFn: () => fetchProgressRequest(videoId!),
    enabled: Boolean(videoId),
  });
}

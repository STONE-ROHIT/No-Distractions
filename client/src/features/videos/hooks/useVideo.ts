import { useQuery } from '@tanstack/react-query';
import { fetchVideoRequest } from '../../../api/videos';

export function useVideo(videoId: string | undefined) {
  return useQuery({
    queryKey: ['videos', videoId],
    queryFn: () => fetchVideoRequest(videoId!),
    enabled: Boolean(videoId),
  });
}

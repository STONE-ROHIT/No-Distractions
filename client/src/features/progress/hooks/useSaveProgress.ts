import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveProgressRequest, type SaveProgressPayload } from '../../../api/progress';
import { continueLearningQueryKey } from './useContinueLearning';
import { progressQueryKey } from './useProgress';

export function useSaveProgress(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveProgressPayload) => saveProgressRequest(videoId, payload),
    onSuccess: (progress) => {
      queryClient.setQueryData(progressQueryKey(videoId), progress);
      // Cheap and correct rather than hand-splicing: the "Continue
      // Learning" list's sort order and completed/in-progress membership
      // both depend on exactly what just changed.
      void queryClient.invalidateQueries({ queryKey: continueLearningQueryKey });
    },
  });
}

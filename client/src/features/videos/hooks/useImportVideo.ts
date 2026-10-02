import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importVideoRequest } from '../../../api/videos';
import { libraryQueryKey } from '../../library/hooks/useLibrary';

export function useImportVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importVideoRequest,
    onSuccess: () => {
      // The import just changed what's in the library — invalidate
      // rather than hand-splice the new item(s) in, since a playlist
      // import can add many at once and re-fetching the real list is
      // simpler than reconstructing it client-side.
      void queryClient.invalidateQueries({ queryKey: libraryQueryKey });
    },
  });
}

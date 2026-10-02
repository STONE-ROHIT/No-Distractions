import { useQuery } from '@tanstack/react-query';
import { fetchLibraryRequest } from '../../../api/library';

export const libraryQueryKey = ['library'] as const;

export function useLibrary() {
  return useQuery({ queryKey: libraryQueryKey, queryFn: fetchLibraryRequest });
}

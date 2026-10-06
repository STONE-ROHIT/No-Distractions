import { useQuery } from '@tanstack/react-query';
import { fetchContinueLearningRequest } from '../../../api/progress';

export const continueLearningQueryKey = ['progress', 'continue-learning'] as const;

export function useContinueLearning() {
  return useQuery({ queryKey: continueLearningQueryKey, queryFn: fetchContinueLearningRequest });
}

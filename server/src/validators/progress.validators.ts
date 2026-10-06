import { z } from 'zod';

export const saveProgressSchema = z.object({
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
  // Present only for an explicit "Mark complete" / "Mark incomplete"
  // action; an ordinary periodic autosave omits it and lets the server
  // judge completion from the percentage instead (see progress.service.ts).
  completed: z.boolean().optional(),
});

export type SaveProgressInput = z.infer<typeof saveProgressSchema>;

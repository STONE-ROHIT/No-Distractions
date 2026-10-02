import { z } from 'zod';

export const importVideoSchema = z.object({
  url: z.string().trim().min(1, 'A URL is required'),
});

export type ImportVideoInput = z.infer<typeof importVideoSchema>;

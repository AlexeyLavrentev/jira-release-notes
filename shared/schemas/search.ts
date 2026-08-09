import { z } from 'zod';

/**
 * Search request body (CONTEXT.md D-02, D-14).
 * mode determines how the backend builds JQL from the fields.
 */
export const SearchBodySchema = z.object({
  mode: z.enum(['jql', 'fixVersion', 'dateRange']),
  project: z.string().min(1, 'project is required'),
  jql: z.string().optional(),
  fixVersion: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type SearchBody = z.infer<typeof SearchBodySchema>;

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
  /**
   * When true, the backend injects `AND statusCategory = Done` into the built JQL
   * so only closed issues are returned (CONTEXT.md D-03, D-06 — smart out-of-the-box).
   * Defaults to true; clients may send false to broaden to all statuses (FILT-02).
   */
  closedOnly: z.boolean().optional().default(true),
});

export type SearchBody = z.infer<typeof SearchBodySchema>;

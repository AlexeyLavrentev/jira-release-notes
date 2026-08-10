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
   * May be sent false to broaden to all statuses (FILT-02).
   *
   * The default-true is applied via z.preprocess so `SearchBodySchema.safeParse` always
   * yields `closedOnly: true` when the client omits it (D-06), while `z.infer` keeps the
   * field OPTIONAL — client code that builds a SearchBody before parsing (SearchForm,
   * SelectPage, ExportPage URL rebuild) does not have to supply it. This differs from
   * `.optional().default(true)`, which would make the parsed-output type require the
   * field and break those client constructors.
   */
  closedOnly: z.preprocess((v) => (v === undefined ? true : v), z.boolean().optional()),
});

export type SearchBody = z.infer<typeof SearchBodySchema>;

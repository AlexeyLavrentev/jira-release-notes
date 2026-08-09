import { useQuery } from '@tanstack/react-query';
import { searchIssues } from '../api/client.js';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * useSearch — POST /api/search (D-39).
 * enabled only when body !== null (form submitted). staleTime 0 — always fresh.
 */
export function useSearch(body: SearchBody | null) {
  return useQuery({
    queryKey: ['search', body],
    queryFn: () => searchIssues(body!),
    enabled: body !== null,
    staleTime: 0,
  });
}

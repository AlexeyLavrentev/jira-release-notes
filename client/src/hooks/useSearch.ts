import { useQuery } from '@tanstack/react-query';
import { searchIssues } from '../api/client.js';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * Shared queryKey builder — used by useSearch (writes the cache) AND EditPage
 * (reads the cache via queryClient.getQueryData). The key MUST be byte-identical
 * at both ends or EditPage misses the entry and refetches (D-05/D-19).
 */
export const searchQueryKey = (body: SearchBody | null) => ['search', body] as const;

/**
 * useSearch — POST /api/search (D-39).
 * enabled only when body !== null (form submitted). staleTime 0 — always fresh.
 */
export function useSearch(body: SearchBody | null) {
  return useQuery({
    queryKey: searchQueryKey(body),
    queryFn: () => searchIssues(body!),
    enabled: body !== null,
    staleTime: 0,
  });
}

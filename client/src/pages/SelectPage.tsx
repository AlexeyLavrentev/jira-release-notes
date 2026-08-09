import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.js';
import { SearchForm } from '../components/SearchForm.js';
import { IssueTable } from '../components/IssueTable.js';
import { useSearch } from '../hooks/useSearch.js';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * SelectPage (D-01..D-08, D-41): container for AppHeader + SearchForm + IssueTable.
 * URL query sync for search criteria. Scroll-to-top on new search.
 */
export function SelectPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchBody, setSearchBody] = useState<SearchBody | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const searchQuery = useSearch(searchBody);

  // Restore from URL on mount (D-17)
  useEffect(() => {
    const project = searchParams.get('project');
    const mode = searchParams.get('mode');
    if (project && mode) {
      const body: SearchBody = {
        mode: mode as SearchBody['mode'],
        project,
      };
      const jql = searchParams.get('jql');
      const fixVersion = searchParams.get('fixVersion');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      if (jql) body.jql = jql;
      if (fixVersion) body.fixVersion = fixVersion;
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;
      setSearchBody(body);
    }
    // Mount-only: intentionally empty deps (restore from URL once on mount)
  }, []);

  // Scroll to top on new search (D-08)
  useEffect(() => {
    if (searchBody && tableRef.current) {
      tableRef.current.scrollTo({ top: 0 });
    }
  }, [searchBody]);

  function handleSubmit(body: SearchBody) {
    // Update URL (D-02)
    const params: Record<string, string> = { mode: body.mode, project: body.project };
    if (body.jql) params.jql = body.jql;
    if (body.fixVersion) params.fixVersion = body.fixVersion;
    if (body.dateFrom) params.dateFrom = body.dateFrom;
    if (body.dateTo) params.dateTo = body.dateTo;
    setSearchParams(params);
    setSearchBody(body);
  }

  // Build initialValues from URL for the form
  const initialValues: Partial<SearchBody> | undefined =
    searchParams.get('project')
      ? {
          project: searchParams.get('project') ?? undefined,
          mode: (searchParams.get('mode') as SearchBody['mode']) ?? undefined,
          jql: searchParams.get('jql') ?? undefined,
          fixVersion: searchParams.get('fixVersion') ?? undefined,
          dateFrom: searchParams.get('dateFrom') ?? undefined,
          dateTo: searchParams.get('dateTo') ?? undefined,
        }
      : undefined;

  return (
    <div>
      <AppHeader />
      <div style={{ position: 'sticky', top: 56, zIndex: 10, background: 'var(--surface)' }}>
        <SearchForm onSubmit={handleSubmit} initialValues={initialValues} />
      </div>
      <IssueTable
        data={searchQuery.data}
        isLoading={searchQuery.isLoading}
        error={searchQuery.error}
        hasSearched={searchBody !== null}
        onRetry={() => searchQuery.refetch()}
        tableRef={tableRef}
      />
    </div>
  );
}

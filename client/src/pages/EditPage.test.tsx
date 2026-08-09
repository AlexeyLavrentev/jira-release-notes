import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { EditPage } from './EditPage.js';
import { searchQueryKey } from '../hooks/useSearch.js';
import type { SearchResponse } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

const searchBody: SearchBody = { mode: 'jql', project: 'PROJ', jql: 'project = PROJ' };
// URL query MUST encode the SAME jql used in searchBody — the cache is keyed by
// the decoded SearchBody, so a mismatch (e.g. 'x' vs 'project = PROJ') misses
// the cache and EditPage shows the empty state.
const SEARCH_URL = '/edit/PROJ-1?project=PROJ&mode=jql&jql=' + encodeURIComponent('project = PROJ');

const sampleIssue = {
  key: 'PROJ-1',
  summary: 'Sample issue',
  releaseNote: 'original text',
  issuetype: { name: 'Task', id: '1' },
  status: { name: 'Done', id: '100' },
  priority: { name: 'Medium', id: '3' },
  components: [],
  fixVersions: [],
  epic: null,
  created: '',
  updated: '',
  resolutiondate: null,
};

const searchResponse: SearchResponse = {
  issues: [sampleIssue],
  total: 1,
  fetched: 1,
  truncated: false,
};

function renderWithProviders(initialPath: string, preseedCache = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (preseedCache) {
    queryClient.setQueryData(searchQueryKey(searchBody), searchResponse);
  }
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/edit/:key" element={<EditPage />} />
            <Route path="/select" element={<div>select page</div>} />
          </Routes>
        </MemoryRouter>
      </EditsProvider>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

describe('EditPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the issue releaseNote in the textarea (EDIT-01 read path)', () => {
    renderWithProviders(SEARCH_URL);
    const textarea = screen.getByLabelText('Release note для PROJ-1') as HTMLTextAreaElement;
    expect(textarea.value).toBe('original text');
  });

  it('typing mutates the edits map (EDIT-01 write path)', () => {
    renderWithProviders(SEARCH_URL);
    const textarea = screen.getByLabelText('Release note для PROJ-1');
    fireEvent.change(textarea, { target: { value: 'edited' } });
    // sessionStorage flushed after debounce
    vi.advanceTimersByTime(300);
    const stored = JSON.parse(sessionStorage.getItem('rn-edits-v1') ?? '{}');
    expect(stored['PROJ-1']).toBe('edited');
  });

  it('survives unmount+remount via sessionStorage (EDIT-03)', () => {
    const { unmount } = renderWithProviders(SEARCH_URL);
    const textarea = screen.getByLabelText('Release note для PROJ-1');
    fireEvent.change(textarea, { target: { value: 'persisted' } });
    vi.advanceTimersByTime(300);
    unmount();

    renderWithProviders(SEARCH_URL);
    const textarea2 = screen.getByLabelText('Release note для PROJ-1') as HTMLTextAreaElement;
    expect(textarea2.value).toBe('persisted');
  });

  it('shows empty state when the cache is empty (D-05 direct URL)', () => {
    renderWithProviders(SEARCH_URL, false);
    expect(screen.getByText('Откройте задачу из списка поиска')).toBeInTheDocument();
    expect(screen.getByText('К списку')).toBeInTheDocument();
  });

  it('renders «Готово» and never «Сохранить» (D-24)', () => {
    renderWithProviders(SEARCH_URL);
    expect(screen.getByText('Готово')).toBeInTheDocument();
    expect(screen.queryByText('Сохранить')).not.toBeInTheDocument();
  });
});

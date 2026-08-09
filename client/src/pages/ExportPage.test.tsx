import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { ExportPage } from './ExportPage.js';
import { searchQueryKey } from '../hooks/useSearch.js';
import type { SearchResponse, Issue } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

const searchBody: SearchBody = { mode: 'jql', project: 'PROJ', jql: 'project = PROJ' };
// URL query MUST encode the SAME jql used in searchBody — the cache is keyed by the decoded
// SearchBody, so a mismatch misses the cache and ExportPage shows the empty state.
const SEARCH_URL = '/export?project=PROJ&mode=jql&jql=' + encodeURIComponent('project = PROJ');

const bug = {
  key: 'PROJ-1',
  summary: 'Sample bug',
  releaseNote: 'Исправлен краш при загрузке данных',
  issuetype: { name: 'Bug', id: '1' },
  status: { name: 'Done', id: '100' },
  priority: { name: 'High', id: '2' },
  components: [{ id: 'c1', name: 'Backend' }],
  fixVersions: [],
  epic: null,
  created: '',
  updated: '',
  resolutiondate: '2026-08-01',
};

const story = {
  key: 'PROJ-2',
  summary: 'Sample story',
  releaseNote: 'Новая фича авторизации готова к релизу',
  issuetype: { name: 'Story', id: '2' },
  status: { name: 'Done', id: '100' },
  priority: { name: 'Medium', id: '3' },
  components: [{ id: 'c2', name: 'Auth' }],
  fixVersions: [],
  epic: { key: 'E-1', summary: 'Auth' },
  created: '',
  updated: '',
  resolutiondate: '2026-08-02',
};

const searchResponse: SearchResponse = {
  issues: [bug, story] as Issue[],
  total: 2,
  fetched: 2,
  truncated: false,
};

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + '?' + loc.search}</div>;
}

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
            <Route
              path="/export"
              element={
                <>
                  <ExportPage />
                  <LocationProbe />
                </>
              }
            />
            <Route
              path="/select"
              element={
                <div>
                  select page
                  <LocationProbe />
                </div>
              }
            />
          </Routes>
        </MemoryRouter>
      </EditsProvider>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

describe('ExportPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders the document H1 "Release Notes" and at least one item li when cache is populated', () => {
    const { container } = renderWithProviders(SEARCH_URL);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Release Notes');
    expect(container.querySelectorAll('li').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the empty state "Сначала найдите задачи" + "К поиску" button when cache is empty', () => {
    renderWithProviders('/export', false);
    expect(screen.getByText('Сначала найдите задачи')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'К поиску' })).toBeInTheDocument();
  });

  it('clicking "К поиску" navigates to /select', () => {
    renderWithProviders('/export', false);
    fireEvent.click(screen.getByRole('button', { name: 'К поиску' }));
    expect(screen.getByTestId('loc').textContent).toContain('/select');
  });

  it('default controls (no URL params) render a single flat group — one H2 "Без групп"', () => {
    const { container } = renderWithProviders(SEARCH_URL);
    const h2s = container.querySelectorAll('h2');
    expect(h2s.length).toBe(1);
    expect(h2s[0].textContent).toContain('Без групп');
  });

  it('renders the «Назад» button with aria-label "Вернуться к списку задач"', () => {
    renderWithProviders(SEARCH_URL);
    expect(screen.getByRole('button', { name: 'Вернуться к списку задач' })).toBeInTheDocument();
  });

  it('reads the cache via queryClient.getQueryData (no refetch)', () => {
    // Structural check mirrored from the acceptance grep: ExportPage must use getQueryData.
    // (No network call is made because there is no enabled useSearch body — verified by the
    // populated-cache test above passing without any fetch mock.)
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, 'ExportPage.tsx'), 'utf8');
    expect(src).toContain('getQueryData');
    expect(src).not.toMatch(/useSearch\s*\(/); // must NOT call useSearch() with an enabled body
  });

  it('changing the grouping via the select to "type" produces multiple H2 groups and updates the URL group param', () => {
    const { container } = renderWithProviders(SEARCH_URL);
    const select = screen.getByRole('combobox', { name: 'Шаблон группировки' });
    fireEvent.change(select, { target: { value: 'type' } });
    const h2s = container.querySelectorAll('h2');
    expect(h2s.length).toBeGreaterThan(1); // Bug + Story → two groups
    const loc = screen.getByTestId('loc').textContent ?? '';
    expect(loc).toContain('group=type');
  });
});

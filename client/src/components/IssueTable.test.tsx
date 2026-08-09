import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { IssueTable } from './IssueTable.js';
import type { SearchResponse, Issue } from '../../../shared/types/issue';

/**
 * IssueTable — Phase 5 D-02 entry button tests. The «Собрать документ» button appears in the
 * action panel (alongside ValidationFilter + counters) only when issues are present, and navigates
 * to /export on click. This test file was created by Plan 04 (Task 2); the table's sorting,
 * validation, and responsive behavior are covered indirectly by the SelectPage integration tests.
 */

const bug: Issue = {
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

const story: Issue = {
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

const populatedResponse: SearchResponse = {
  issues: [bug, story],
  total: 2,
  fetched: 2,
  truncated: false,
};

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + '?' + loc.search}</div>;
}

function renderTable(props: {
  data?: SearchResponse;
  isLoading?: boolean;
  error?: unknown;
  hasSearched?: boolean;
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={['/select']}>
          <Routes>
            <Route
              path="/select"
              element={
                <>
                  <IssueTable
                    data={props.data}
                    isLoading={props.isLoading ?? false}
                    error={props.error ?? null}
                    hasSearched={props.hasSearched ?? true}
                  />
                  <LocationProbe />
                </>
              }
            />
            <Route
              path="/export"
              element={
                <div>
                  export page
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

/** Render with the populated cache (the default happy path — issues present). */
function renderPopulated() {
  return renderTable({ data: populatedResponse, hasSearched: true });
}

describe('IssueTable — «Собрать документ» entry button (D-02)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders the «Собрать документ» button with the right text + aria-label when issues are present', () => {
    renderPopulated();
    const btn = screen.getByRole('button', { name: 'Собрать документ release notes' });
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toBe('Собрать документ');
  });

  it('clicking the button navigates to /export', () => {
    renderPopulated();
    fireEvent.click(screen.getByRole('button', { name: 'Собрать документ release notes' }));
    expect(screen.getByTestId('loc').textContent).toContain('/export');
  });

  it('does NOT render the button before the first search (no data, not searched)', () => {
    renderTable({ hasSearched: false });
    expect(screen.queryByRole('button', { name: 'Собрать документ release notes' })).not.toBeInTheDocument();
  });

  it('does NOT render the button in the loading state', () => {
    renderTable({ isLoading: true, hasSearched: true });
    expect(screen.queryByRole('button', { name: 'Собрать документ release notes' })).not.toBeInTheDocument();
  });

  it('does NOT render the button in the error state', () => {
    renderTable({ error: new Error('boom'), hasSearched: true });
    expect(screen.queryByRole('button', { name: 'Собрать документ release notes' })).not.toBeInTheDocument();
  });

  it('does NOT render the button in the no-results state (searched, empty issues)', () => {
    renderTable({ data: { issues: [], total: 0, fetched: 0, truncated: false }, hasSearched: true });
    expect(screen.queryByRole('button', { name: 'Собрать документ release notes' })).not.toBeInTheDocument();
  });

  it('the button style matches EditPage.doneBtnStyle (solid accent, white text, 600 weight, 8px radius, accent border)', () => {
    renderPopulated();
    const btn = screen.getByRole('button', { name: 'Собрать документ release notes' }) as HTMLButtonElement;
    // jsdom normalizes some values via the style DOM property (#fff → rgb(255,255,255)); assert the
    // parts that survive serialization here, then assert byte-parity with EditPage.doneBtnStyle via a
    // source grep (the canonical check — the authored const must contain every doneBtnStyle token).
    const styleAttr = btn.getAttribute('style') ?? '';
    expect(styleAttr).toContain('background: var(--accent)'); // CSS var not resolvable → preserved
    expect(styleAttr).toContain('font-weight: 600');
    expect(styleAttr).toContain('border-radius: 8px');
    expect(styleAttr).toContain('border: 1px solid var(--accent)');
    expect(styleAttr).toContain('color: rgb(255, 255, 255)'); // #fff normalized

    // Source-level byte-parity with EditPage.doneBtnStyle (UI-SPEC #8 acceptance).
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, 'IssueTable.tsx'), 'utf8');
    expect(src).toContain("background: 'var(--accent)'");
    expect(src).toContain("color: '#fff'");
    expect(src).toContain("fontWeight: 600");
    expect(src).toContain("borderRadius: 8");
    expect(src).toContain("border: '1px solid var(--accent)'");
  });

  it('navigate(\'/export\') is wired exactly once (acceptance grep)', () => {
    // Structural assertion mirroring the plan's acceptance grep.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, 'IssueTable.tsx'), 'utf8');
    const matches = src.match(/navigate\('\/export'\)/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { ValidationProvider } from '../context/ValidationContext.js';
import { IssueTable } from './IssueTable.js';
import { SKIP_MARKER } from '../lib/validation.js';
import type { SearchResponse, Issue } from '../../../shared/types/issue';
import fs from 'node:fs';
import path from 'node:path';

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
      <ValidationProvider>
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
      </ValidationProvider>
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
    const src = fs.readFileSync(path.resolve(__dirname, 'IssueTable.tsx'), 'utf8');
    expect(src).toContain("background: 'var(--accent)'");
    expect(src).toContain("color: '#fff'");
    expect(src).toContain("fontWeight: 600");
    expect(src).toContain("borderRadius: 8");
    expect(src).toContain("border: '1px solid var(--accent)'");
  });

  it('navigate to /export is wired exactly once (acceptance grep)', () => {
    // Structural assertion mirroring the plan's acceptance grep.
    // The entry button forwards search params so ExportPage can rebuild the cache key:
    //   navigate(`/export?${searchParams.toString()}`)
    const src = fs.readFileSync(path.resolve(__dirname, 'IssueTable.tsx'), 'utf8');
    const matches = src.match(/navigate\(`\/export\?\$\{searchParams\.toString\(\)\}`\)/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

// ─── Plan 02: SKIP-02 skip-filter (D-11, SKIP-02) ─────────────────────────

/** Skip issue: releaseNote is exactly the SKIP_MARKER → classified 'skip' by validateReleaseNote. */
const skipIssue: Issue = {
  key: 'PROJ-9',
  summary: 'Skipped from release notes',
  releaseNote: SKIP_MARKER,
  issuetype: { name: 'Task', id: '3' },
  status: { name: 'Done', id: '100' },
  priority: { name: 'Low', id: '4' },
  components: [],
  fixVersions: [],
  epic: null,
  created: '',
  updated: '',
  resolutiondate: '2026-08-03',
};

/** Response with one skip issue alongside the bug+story from the populated fixture. */
const responseWithSkip: SearchResponse = {
  issues: [bug, story, skipIssue],
  total: 3,
  fetched: 3,
  truncated: false,
};

describe('IssueTable — skip filter (D-11, SKIP-02)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('clicking «Только пропущенные» shows ONLY the skip issue (D-12)', () => {
    renderTable({ data: responseWithSkip, hasSearched: true });
    // Activate the skip segment.
    fireEvent.click(screen.getByRole('button', { name: 'Только пропущенные' }));
    // The skip issue's key is present (rendered in BOTH the desktop table row and the mobile
    // card — IssueTable renders both and jsdom applies no CSS, so queryAll is needed).
    expect(screen.getAllByText('PROJ-9').length).toBeGreaterThan(0);
    // ...but the bug+story keys are filtered out of both the table and the card list.
    expect(screen.queryByText('PROJ-1')).not.toBeInTheDocument();
    expect(screen.queryByText('PROJ-2')).not.toBeInTheDocument();
  });

  it('«Проблемные» does NOT show the skip issue (D-11 regression guard — skip is not a problem)', () => {
    renderTable({ data: responseWithSkip, hasSearched: true });
    fireEvent.click(screen.getByRole('button', { name: 'Только проблемные' }));
    // Bug + story are both valid (they have well-formed release notes), so the problematic
    // segment shows neither of them nor the skip issue. The skip issue's key must not appear.
    expect(screen.queryByText('PROJ-9')).not.toBeInTheDocument();
  });

  it('«Пропущено: 1» counter renders when a skip issue is present (D-10)', () => {
    renderTable({ data: responseWithSkip, hasSearched: true });
    expect(screen.getByText('Пропущено:')).toBeInTheDocument();
    // The count value (1) is rendered inside a <strong>.
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('«Пропущено» counter does NOT render when there are no skip issues', () => {
    // populatedResponse (bug + story) has zero skip issues → counter must be absent.
    renderPopulated();
    expect(screen.queryByText('Пропущено:')).not.toBeInTheDocument();
  });

  it('selecting «Только пропущенные» with zero skip tasks shows an empty body (no crash, D-12)', () => {
    // populatedResponse has no skip issues. Activating the skip segment must not crash and
    // must hide both bug+story rows.
    renderPopulated();
    fireEvent.click(screen.getByRole('button', { name: 'Только пропущенные' }));
    expect(screen.queryByText('PROJ-1')).not.toBeInTheDocument();
    expect(screen.queryByText('PROJ-2')).not.toBeInTheDocument();
  });
});

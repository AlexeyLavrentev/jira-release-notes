import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { EditPage } from './EditPage.js';
import { searchQueryKey } from '../hooks/useSearch.js';
import { SKIP_MARKER } from '../lib/validation.js';
import type { SearchResponse, Issue } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

const searchBody: SearchBody = { mode: 'jql', project: 'PROJ', jql: 'project = PROJ', closedOnly: true };
// URL query MUST encode the SAME jql used in searchBody — the cache is keyed by
// the decoded SearchBody, so a mismatch (e.g. 'x' vs 'project = PROJ') misses
// the cache and EditPage shows the empty state. closedOnly is absent from the URL
// → rebuildSearchBody reconstructs it as true (default ON, D-06), so the seeded
// searchBody MUST also carry closedOnly: true or the cache key misses.
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

// ─── Plan 04: navigation ↑↓, Esc, mobile tabs ───────────────────────────────

function makeIssue(key: string, releaseNote: string): Issue {
  return {
    key,
    summary: `${key} summary`,
    releaseNote,
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
}

const multiIssues: Issue[] = [
  makeIssue('PROJ-1', 'note one'),
  makeIssue('PROJ-2', 'note two'),
  makeIssue('PROJ-3', 'note three'),
];
const multiResponse: SearchResponse = { issues: multiIssues, total: 3, fetched: 3, truncated: false };

/** Probe that exposes the current location pathname so nav assertions work without mocking. */
let lastLocation = '';
function LocationProbe() {
  const loc = useLocation();
  lastLocation = loc.pathname;
  return null;
}

function renderMulti(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(searchQueryKey(searchBody), multiResponse);
  lastLocation = '';
  return render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <LocationProbe />
          <Routes>
            <Route path="/edit/:key" element={<EditPage />} />
            <Route path="/select" element={<div>select page</div>} />
          </Routes>
        </MemoryRouter>
      </EditsProvider>
    </QueryClientProvider>,
  );
}

const multiUrl = (key: string) => `/edit/${key}?project=PROJ&mode=jql&jql=${encodeURIComponent('project = PROJ')}`;

describe('EditPage navigation ↑↓ (D-04)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('↓ (Следующая) navigates to the next key', () => {
    renderMulti(multiUrl('PROJ-1'));
    fireEvent.click(screen.getByLabelText('Следующая задача'));
    expect(lastLocation).toBe('/edit/PROJ-2');
  });

  it('↑ (Предыдущая) navigates to the previous key', () => {
    renderMulti(multiUrl('PROJ-2'));
    fireEvent.click(screen.getByLabelText('Предыдущая задача'));
    expect(lastLocation).toBe('/edit/PROJ-1');
  });

  it('↑ is disabled at the first key', () => {
    renderMulti(multiUrl('PROJ-1'));
    expect(screen.getByLabelText('Предыдущая задача')).toBeDisabled();
  });

  it('↓ is disabled at the last key', () => {
    renderMulti(multiUrl('PROJ-3'));
    expect(screen.getByLabelText('Следующая задача')).toBeDisabled();
  });
});

describe('EditPage Esc shortcut (D-23)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('pressing Escape navigates to /select', () => {
    renderMulti(multiUrl('PROJ-1'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('select page')).toBeInTheDocument();
  });
});

describe('EditPage mobile tabs (D-22)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('renders a role=tablist with Правки + Предпросмотр tabs', () => {
    renderMulti(multiUrl('PROJ-1'));
    const tablist = screen.getByRole('tablist', { name: 'Режим редактора' });
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });

  it('defaults to the Правки (edit) tab selected', () => {
    renderMulti(multiUrl('PROJ-1'));
    const editTab = screen.getByRole('tab', { name: 'Правки' });
    expect(editTab).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking Предпросмотр selects the preview tab', () => {
    renderMulti(multiUrl('PROJ-1'));
    fireEvent.click(screen.getByRole('tab', { name: 'Предпросмотр' }));
    const previewTab = screen.getByRole('tab', { name: 'Предпросмотр' });
    const editTab = screen.getByRole('tab', { name: 'Правки' });
    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(editTab).toHaveAttribute('aria-selected', 'false');
  });

  it('keyboard ArrowRight moves focus to the preview tab', () => {
    renderMulti(multiUrl('PROJ-1'));
    const tablist = screen.getByRole('tablist', { name: 'Режим редактора' });
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Предпросмотр' })).toHaveAttribute('aria-selected', 'true');
  });
});

// ─── Plan 02: SKIP-02 EditPage read-only skip rendering (D-13/D-14/D-18) ───

/** Issue whose releaseNote is the skip marker → EditPage must render it read-only (no textarea). */
const skipMarkerIssue: Issue = {
  key: 'PROJ-1',
  summary: 'Skipped from release notes',
  releaseNote: SKIP_MARKER,
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

const skipResponse: SearchResponse = {
  issues: [skipMarkerIssue],
  total: 1,
  fetched: 1,
  truncated: false,
};

/**
 * Render EditPage with the skip-marker response seeded into the cache. Follows the existing
 * renderWithProviders pattern but swaps the seeded response so the issue's releaseNote is the
 * skip marker. Optionally preseeds an edits entry (D-18 reactivation case) by writing to
 * sessionStorage BEFORE the provider mounts (the same seeding pattern renderRowWithProviders uses).
 */
function renderSkip(edits: Record<string, string> = {}) {
  if (Object.keys(edits).length > 0) {
    sessionStorage.setItem('rn-edits-v1', JSON.stringify(edits));
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(searchQueryKey(searchBody), skipResponse);
  return render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={[SEARCH_URL]}>
          <Routes>
            <Route path="/edit/:key" element={<EditPage />} />
            <Route path="/select" element={<div>select page</div>} />
          </Routes>
        </MemoryRouter>
      </EditsProvider>
    </QueryClientProvider>,
  );
}

describe('EditPage skip-issue rendering (D-13/D-14/D-18, SKIP-02)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('renders NO textarea for a skip issue — the field is read-only display text (D-13/D-14)', () => {
    renderSkip();
    // No editable textarea is present for a skip issue.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // The read-only display block shows the marker text so the author sees it was dropped.
    expect(screen.getByText('<no-release-notes>')).toBeInTheDocument();
    // The Ban icon labels the row as skip.
    expect(screen.getByLabelText('Пропущено (маркер <no-release-notes>)')).toBeInTheDocument();
  });

  it('renders the normal editable textarea when the engineer removed the marker via an edit (D-18)', () => {
    // The edits map preseeds real text for the skip-marker key — edits priority means the
    // resolved text is the edited value, validateReleaseNote returns non-skip → isSkip is false.
    renderSkip({ 'PROJ-1': 'Реальный текст release note после удаления маркера' });
    // The textarea IS present again — the task reverts to editable.
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    // The read-only marker display block is gone.
    expect(screen.queryByText('<no-release-notes>')).not.toBeInTheDocument();
  });
});


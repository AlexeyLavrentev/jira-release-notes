import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { OverridesProvider } from '../context/OverridesContext.js';
import { IssueRow } from './IssueRow.js';
import type { Issue } from '../../../shared/types/issue';

const issue: Issue = {
  key: 'PROJ-1',
  summary: 'Sample',
  releaseNote: 'some note',
  issuetype: { name: 'Task', id: '1' },
  status: { name: 'Done', id: '100' },
  priority: { name: 'Medium', id: '3' },
  components: [],
  fixVersions: [],
  epic: null,
  assignee: null,
  reporter: 'Иван Петров',
  url: 'https://jira.example.com/browse/PROJ-1',
  created: '',
  updated: '',
  resolutiondate: null,
};

function renderRowWithProviders(
  seedEdits?: Record<string, string>,
  category: 'valid' | 'skip' = 'valid',
  issueOverride?: Issue,
) {
  const issueUnderTest = issueOverride ?? issue;
  if (seedEdits) {
    sessionStorage.setItem('rn-edits-v1', JSON.stringify(seedEdits));
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        {/* Phase 14: OverridesProvider nested inside EditsProvider — same order as production App. */}
        <OverridesProvider>
          <MemoryRouter initialEntries={['/select']}>
            <Routes>
              <Route path="/select" element={<IssueRow issue={issueUnderTest} category={category} />} />
              <Route path="/edit/:key" element={<div>edit page</div>} />
            </Routes>
          </MemoryRouter>
        </OverridesProvider>
      </EditsProvider>
    </QueryClientProvider>,
  );
}

describe('IssueRow edit entry point', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('renders the «Редактировать» button with an aria-label', () => {
    renderRowWithProviders();
    expect(screen.getByLabelText('Редактировать PROJ-1')).toBeInTheDocument();
  });

  it('clicking the button navigates to /edit/:key', () => {
    renderRowWithProviders();
    fireEvent.click(screen.getByLabelText('Редактировать PROJ-1'));
    expect(screen.getByText('edit page')).toBeInTheDocument();
  });

  it('does not show the «Отредактировано» indicator when the issue is not edited', () => {
    renderRowWithProviders();
    expect(screen.queryByLabelText('Отредактировано')).not.toBeInTheDocument();
  });

  it('shows the «Отредактировано» indicator when the issue is in the edits map (D-20)', () => {
    renderRowWithProviders({ 'PROJ-1': 'edited text' });
    expect(screen.getByLabelText('Отредактировано')).toBeInTheDocument();
  });
});

// ─── Plan 02: SKIP-02 skip-row rendering (D-07, D-09, SKIP-02) ────────────

describe('IssueRow skip category (D-07/D-09, SKIP-02)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('renders the Ban flag with the «Пропущено» aria-label for a skip row (D-09)', () => {
    renderRowWithProviders(undefined, 'skip');
    // FLAG_LABEL['skip'] = 'Пропущено (маркер <no-release-notes>)'. The Ban icon carries it as
    // aria-label, so getByLabelText finds the icon.
    expect(screen.getByLabelText('Пропущено (маркер <no-release-notes>)')).toBeInTheDocument();
  });

  it('a skip row is still expandable — clicking reveals the detail block (D-07)', () => {
    renderRowWithProviders(undefined, 'skip');
    // The row starts collapsed; the detail block (Release Note: header) is absent.
    expect(screen.queryByText('Release Note:')).not.toBeInTheDocument();
    // The <tr> toggles expand on click. Click the row's first cell (the key code) to expand.
    fireEvent.click(screen.getByText('PROJ-1'));
    // The detail block header now appears — the skip row is expandable like any other (D-07).
    expect(screen.getByText('Release Note:')).toBeInTheDocument();
  });
});

// ─── Expanded detail: Jira link, reporter, assignee ───────────────────────

describe('IssueRow expanded detail (link + author + assignee)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('expanded row shows the Jira link, reporter and unassigned fallback', () => {
    renderRowWithProviders();
    fireEvent.click(screen.getByText('PROJ-1'));
    const link = screen.getByRole('link', { name: /Открыть в Jira/i });
    expect(link).toHaveAttribute('href', 'https://jira.example.com/browse/PROJ-1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Автор:')).toBeInTheDocument();
    expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    expect(screen.getByText('не назначен')).toBeInTheDocument();
  });
});

// ─── Phase 13: HILITE-01 multi-component marker ────────────

const MULTI_COMPONENT_MARKER_TITLE =
  'Несколько компонентов — при группировке попадёт в одну группу (последний компонент)';

const multiComponentIssue: Issue = {
  ...issue,
  components: [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
  ],
};

describe('IssueRow multi-component marker (HILITE-01, D-01/D-02/D-04)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('a 2-component issue shows the marker with the exact D-02 title and aria-label', () => {
    renderRowWithProviders(undefined, 'valid', multiComponentIssue);
    // D-02: the title attribute IS the tooltip; the aria-label mirrors it for AT.
    expect(screen.getByTitle(MULTI_COMPONENT_MARKER_TITLE)).toBeInTheDocument();
    expect(screen.getByLabelText(MULTI_COMPONENT_MARKER_TITLE)).toBeInTheDocument();
  });

  it('the marker is a non-interactive span in warning color with an aria-hidden icon', () => {
    renderRowWithProviders(undefined, 'valid', multiComponentIssue);
    const marker = screen.getByTitle(MULTI_COMPONENT_MARKER_TITLE);
    expect(marker.tagName).toBe('SPAN');
    // Prohibition 1: informational var(--warning) semantics, never var(--error).
    expect(marker.style.color).toBe('var(--warning)');
    // D-04: the inner icon is decorative; the wrapper span owns the labels.
    const svg = marker.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('issues with 0 or 1 components render no marker (criterion 3 — no false positives)', () => {
    renderRowWithProviders();
    expect(screen.queryByTitle(MULTI_COMPONENT_MARKER_TITLE)).not.toBeInTheDocument();
    cleanup();
    const singleComponentIssue: Issue = { ...issue, components: [{ id: '1', name: 'Alpha' }] };
    renderRowWithProviders(undefined, 'valid', singleComponentIssue);
    expect(screen.queryByTitle(MULTI_COMPONENT_MARKER_TITLE)).not.toBeInTheDocument();
  });

  it('marker presence is independent of validation category and edit state (criterion 4)', () => {
    // skip category + seeded edit — the marker must still be there: presence is a pure
    // function of issue.components composition.
    renderRowWithProviders({ 'PROJ-1': 'edited text' }, 'skip', multiComponentIssue);
    expect(screen.getByTitle(MULTI_COMPONENT_MARKER_TITLE)).toBeInTheDocument();
  });
});

// ─── Phase 14: OVRD-01 group override selector ────────────

describe('IssueRow group override selector (OVRD-01)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('an expanded 2-component row renders the «Группа» select with «По умолчанию» + components', () => {
    renderRowWithProviders(undefined, 'valid', multiComponentIssue);
    fireEvent.click(screen.getByText('PROJ-1'));
    const select = screen.getByLabelText('Группа для PROJ-1') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    // Option labels are exactly «По умолчанию» + the issue's component names, in order.
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['По умолчанию', 'Alpha', 'Beta']);
    // The default option carries the empty reset sentinel (absent key = last-wins default).
    expect(select.options[0].value).toBe('');
  });

  it('a persisted override is shown as the select value (read path / F5)', () => {
    sessionStorage.setItem('rn-overrides-v1', JSON.stringify({ 'PROJ-1': 'Alpha' }));
    renderRowWithProviders(undefined, 'valid', multiComponentIssue);
    fireEvent.click(screen.getByText('PROJ-1'));
    expect((screen.getByLabelText('Группа для PROJ-1') as HTMLSelectElement).value).toBe('Alpha');
  });

  it('choosing a component persists it; choosing «По умолчанию» resets (deletes the key)', async () => {
    renderRowWithProviders(undefined, 'valid', multiComponentIssue);
    fireEvent.click(screen.getByText('PROJ-1'));
    const select = screen.getByLabelText('Группа для PROJ-1') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Beta' } });
    expect(select.value).toBe('Beta');
    // Tracer promise: the choice lands in sessionStorage via the debounced hook write.
    await waitFor(() => expect(sessionStorage.getItem('rn-overrides-v1')).toBe('{"PROJ-1":"Beta"}'));
    // Reset path: '' deletes the key from the context map → empty map persists after the debounce.
    fireEvent.change(select, { target: { value: '' } });
    expect(select.value).toBe('');
    await waitFor(() => expect(sessionStorage.getItem('rn-overrides-v1')).toBe('{}'));
  });

  it('rows with 0 or 1 components render no select (locked UI decision)', () => {
    renderRowWithProviders();
    fireEvent.click(screen.getByText('PROJ-1'));
    expect(screen.queryByLabelText(/^Группа для/)).not.toBeInTheDocument();
    cleanup();
    const singleComponentIssue: Issue = { ...issue, components: [{ id: '1', name: 'Alpha' }] };
    renderRowWithProviders(undefined, 'valid', singleComponentIssue);
    fireEvent.click(screen.getByText('PROJ-1'));
    expect(screen.queryByLabelText(/^Группа для/)).not.toBeInTheDocument();
  });
});

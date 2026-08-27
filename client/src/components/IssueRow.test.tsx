import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
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
) {
  if (seedEdits) {
    sessionStorage.setItem('rn-edits-v1', JSON.stringify(seedEdits));
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={['/select']}>
          <Routes>
            <Route path="/select" element={<IssueRow issue={issue} category={category} />} />
            <Route path="/edit/:key" element={<div>edit page</div>} />
          </Routes>
        </MemoryRouter>
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

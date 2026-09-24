import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { MobileIssueCard } from './MobileIssueCard.js';
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

function renderCardWithProviders(issueOverride?: Issue) {
  const issueUnderTest = issueOverride ?? issue;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={['/select']}>
          <Routes>
            <Route path="/select" element={<MobileIssueCard issue={issueUnderTest} category="valid" />} />
            <Route path="/edit/:key" element={<div>edit page</div>} />
          </Routes>
        </MemoryRouter>
      </EditsProvider>
    </QueryClientProvider>,
  );
}

// ─── Phase 13: HILITE-01 multi-component marker (mobile, D-03/D-04) ────────

const MULTI_COMPONENT_MARKER_TITLE =
  'Несколько компонентов — при группировке попадёт в одну группу (последний компонент)';

const multiComponentIssue: Issue = {
  ...issue,
  components: [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
  ],
};

describe('MobileIssueCard multi-component marker (HILITE-01, D-03/D-04)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('renders the card with the «Редактировать» button (smoke — provider wrapper works)', () => {
    renderCardWithProviders();
    expect(screen.getByLabelText('Редактировать PROJ-1')).toBeInTheDocument();
  });

  it('an expanded 2-component card shows the marker with the exact D-02 title and aria-label', () => {
    renderCardWithProviders(multiComponentIssue);
    // The card starts collapsed; click the key to expand (bubbles to the root onClick).
    fireEvent.click(screen.getByText('PROJ-1'));
    // The «Компоненты:» line renders only in the expanded detail block (D-03, FA-13-01).
    expect(screen.getByText('Компоненты: Alpha, Beta')).toBeInTheDocument();
    const marker = screen.getByTitle(MULTI_COMPONENT_MARKER_TITLE);
    expect(marker).toBeInTheDocument();
    expect(screen.getByLabelText(MULTI_COMPONENT_MARKER_TITLE)).toBeInTheDocument();
    expect(marker.tagName).toBe('SPAN');
    expect(marker.style.color).toBe('var(--warning)');
  });

  it('an expanded card with exactly 1 component renders the «Компоненты:» line but no marker', () => {
    const singleComponentIssue: Issue = { ...issue, components: [{ id: '1', name: 'Alpha' }] };
    renderCardWithProviders(singleComponentIssue);
    fireEvent.click(screen.getByText('PROJ-1'));
    expect(screen.getByText('Компоненты: Alpha')).toBeInTheDocument();
    expect(screen.queryByTitle(MULTI_COMPONENT_MARKER_TITLE)).not.toBeInTheDocument();
  });

  it('the marker is not a control — no button role with the D-02 name (D-04)', () => {
    renderCardWithProviders(multiComponentIssue);
    fireEvent.click(screen.getByText('PROJ-1'));
    expect(
      screen.queryByRole('button', { name: MULTI_COMPONENT_MARKER_TITLE }),
    ).not.toBeInTheDocument();
  });
});

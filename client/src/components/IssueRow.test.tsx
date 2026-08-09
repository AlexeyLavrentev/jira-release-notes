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
  created: '',
  updated: '',
  resolutiondate: null,
};

function renderRowWithProviders(seedEdits?: Record<string, string>) {
  if (seedEdits) {
    sessionStorage.setItem('rn-edits-v1', JSON.stringify(seedEdits));
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditsProvider>
        <MemoryRouter initialEntries={['/select']}>
          <Routes>
            <Route path="/select" element={<IssueRow issue={issue} category="valid" />} />
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

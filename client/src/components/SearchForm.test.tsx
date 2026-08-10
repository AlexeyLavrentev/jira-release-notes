import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Project, Version } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * SearchForm characterization tests (Plan 04 Task 1 — Nyquist guardrail).
 *
 * No test existed for SearchForm before this plan. These tests lock the component's OBSERVABLE
 * BEHAVIOR (rendering, submit contract, initialValues pre-fill) so the token refactor in Task 2
 * is provably behavior-preserving. They are NOT style tests — they must pass against the current
 * (magic-number) component AND against the refactored (token) component.
 *
 * SearchForm pulls projects/versions via react-query (useProjects / useVersions), so the api
 * client module is mocked to return deterministic data and the component is rendered inside a
 * QueryClientProvider (mirrors IssueTable.test.tsx's wrapper pattern).
 */

vi.mock('../api/client.js', () => ({
  fetchProjects: vi.fn(async (): Promise<Project[]> => [
    { key: 'PROJ', name: 'Проект' },
    { key: 'OTHER', name: 'Другой' },
  ]),
  fetchVersions: vi.fn(async (): Promise<Version[]> => [
    { id: '1', name: 'v1.0', released: true, archived: false },
    { id: '2', name: 'v2.0-unrel', released: false, archived: false },
  ]),
  // The remaining exports of api/client are imported by other modules transitively at runtime;
  // re-stub them as no-ops so the module shape is satisfied if needed.
  fetchSearch: vi.fn(),
}));

// Import AFTER the vi.mock above so the component sees the mocked module.
const { SearchForm } = await import('./SearchForm.js');

function renderForm(initialValues?: Partial<SearchBody>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSubmit = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SearchForm onSubmit={onSubmit} initialValues={initialValues} />
    </QueryClientProvider>,
  );
  return { ...utils, onSubmit, queryClient };
}

describe('SearchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows the submit button labeled «Найти»', () => {
    renderForm();
    const submit = screen.getByRole('button', { name: 'Найти' });
    expect(submit).toBeInTheDocument();
    expect(submit.getAttribute('type')).toBe('submit');
  });

  it('renders the three mode tabs in order: JQL / Версия / Даты', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'JQL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Версия' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Даты' })).toBeInTheDocument();
  });

  it('defaults to jql mode and disables submit when project + jql are empty', () => {
    const { onSubmit } = renderForm();
    const submit = screen.getByRole('button', { name: 'Найти' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    // jql tab is the active mode → the JQL textarea is rendered
    expect(screen.getByPlaceholderText(/project = PROJ AND status = Done/)).toBeInTheDocument();
    fireEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  /**
   * Helper: wait for the projects <option> list to hydrate from the mocked react-query before
   * interacting with the project <select>. jsdom reports a controlled select's value as '' until
   * a matching <option> exists in the DOM, so awaiting the option (not just the select element)
   * is what makes the controlled value observable.
   */
  async function waitForProjects() {
    return screen.findByText('Проект (PROJ)');
  }

  it('submitting with a project selected and a JQL query calls onSubmit with the assembled SearchBody', async () => {
    const { onSubmit, container } = renderForm();
    // Wait for the projects query to populate the select's options.
    await waitForProjects();
    const projectSelect = screen.getByLabelText('Проект') as HTMLSelectElement;
    fireEvent.change(projectSelect, { target: { value: 'PROJ' } });

    const jqlTextarea = screen.getByPlaceholderText(/project = PROJ AND status = Done/) as HTMLTextAreaElement;
    fireEvent.change(jqlTextarea, { target: { value: 'status = Done' } });

    const submit = screen.getByRole('button', { name: 'Найти' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'jql',
      project: 'PROJ',
      jql: 'status = Done',
    });
    // sanity: container present (no crash during submit)
    expect(container).toBeTruthy();
  });

  it('initialValues pre-fills the project select and jql textarea on mount', async () => {
    renderForm({ project: 'PROJ', mode: 'jql', jql: 'project = PROJ' });
    // Wait for the option to render so the controlled select reflects the prefilled value.
    await waitForProjects();
    const projectSelect = screen.getByLabelText('Проект') as HTMLSelectElement;
    expect(projectSelect.value).toBe('PROJ');
    const jqlTextarea = screen.getByPlaceholderText(/project = PROJ AND status = Done/) as HTMLTextAreaElement;
    expect(jqlTextarea.value).toBe('project = PROJ');
  });

  it('selecting the «Версия» tab reveals the version select, and submitting calls onSubmit with mode=fixVersion', async () => {
    const { onSubmit } = renderForm({ project: 'PROJ' });
    await waitForProjects();
    fireEvent.click(screen.getByRole('button', { name: 'Версия' }));

    const versionSelect = await screen.findByLabelText('Версия') as HTMLSelectElement;
    fireEvent.change(versionSelect, { target: { value: 'v1.0' } });

    const submit = screen.getByRole('button', { name: 'Найти' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'fixVersion',
      project: 'PROJ',
      fixVersion: 'v1.0',
    });
  });

  it('selecting the «Даты» tab reveals date inputs, and submitting calls onSubmit with mode=dateRange', async () => {
    const { onSubmit } = renderForm({ project: 'PROJ' });
    await waitForProjects();
    fireEvent.click(screen.getByRole('button', { name: 'Даты' }));

    const from = screen.getByLabelText('Дата начала') as HTMLInputElement;
    const to = screen.getByLabelText('Дата окончания') as HTMLInputElement;
    fireEvent.change(from, { target: { value: '2026-01-01' } });
    fireEvent.change(to, { target: { value: '2026-02-01' } });

    const submit = screen.getByRole('button', { name: 'Найти' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'dateRange',
      project: 'PROJ',
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    });
  });

  it('shows a validation error when dateFrom is later than dateTo and blocks submit', async () => {
    const { onSubmit } = renderForm({ project: 'PROJ' });
    await waitForProjects();
    fireEvent.click(screen.getByRole('button', { name: 'Даты' }));
    fireEvent.change(screen.getByLabelText('Дата начала'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Дата окончания'), { target: { value: '2026-02-01' } });

    // The error renders as a bulleted list item ("• <error>"); match by substring.
    expect(screen.getByText(/Дата начала позже даты окончания/)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Найти' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

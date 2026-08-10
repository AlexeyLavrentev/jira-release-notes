import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditsProvider } from '../context/EditsContext.js';
import { ExportPage } from './ExportPage.js';
import { searchQueryKey } from '../hooks/useSearch.js';
import type { SearchResponse, Issue } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Mock the download module so the export-button tests can assert downloadFile is called with the
 * right (content, ext, filename) WITHOUT jsdom attempting a real navigation, and so the failure
 * test can make downloadFile throw. buildMarkdown/buildPlain/buildHtml stay real — the format
 * layer is pure and unit-tested elsewhere; here we verify ExportPage wires it to downloadFile.
 */
const downloadFileMock = vi.fn<(text: string, ext: 'md' | 'txt' | 'html', filename: string) => void>();
vi.mock('../lib/exporter/index.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/exporter/index.js')>(
    '../lib/exporter/index.js',
  );
  return {
    ...actual,
    downloadFile: (...args: Parameters<typeof downloadFileMock>) => downloadFileMock(...args),
    // buildExportFilename real — lets the filename assertion verify the real sanitize/fallback chain.
  };
});

const searchBody: SearchBody = { mode: 'jql', project: 'PROJ', jql: 'project = PROJ', closedOnly: true };
// URL query MUST encode the SAME jql used in searchBody — the cache is keyed by the decoded
// SearchBody, so a mismatch misses the cache and ExportPage shows the empty state. closedOnly is
// absent from the URL → rebuildSearchBody reconstructs it as true (default ON, D-06), so the seeded
// searchBody MUST also carry closedOnly: true or the cache key misses.
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
    downloadFileMock.mockReset();
    downloadFileMock.mockImplementation(() => undefined); // default: success, no throw
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
    const src = fs.readFileSync(path.resolve(__dirname, 'ExportPage.tsx'), 'utf8');
    expect(src).toContain('getQueryData');
    expect(src).not.toMatch(/useSearch\s*\(/); // must NOT call useSearch() with an enabled body
  });

  it('changing the grouping via the GroupingControl radiogroup to "type" produces multiple H2 groups and updates the URL group param', () => {
    const { container } = renderWithProviders(SEARCH_URL);
    // Plan 04 replaced the tracer inline <select> with the GroupingControl radiogroup. Click the
    // «По типу» radio to switch grouping to 'type'.
    const radio = screen.getByRole('radio', { name: 'По типу' });
    fireEvent.click(radio);
    const h2s = container.querySelectorAll('h2');
    expect(h2s.length).toBeGreaterThan(1); // Bug + Story → two groups
    const loc = screen.getByTestId('loc').textContent ?? '';
    expect(loc).toContain('group=type');
  });

  it('renders a GroupingControl radiogroup (role=radiogroup) — not the old tracer <select>', () => {
    renderWithProviders(SEARCH_URL);
    expect(screen.getByRole('radiogroup', { name: 'Шаблон группировки' })).toBeInTheDocument();
    // The tracer combobox is gone.
    expect(screen.queryByRole('combobox', { name: 'Шаблон группировки' })).not.toBeInTheDocument();
  });

  it('renders the three section captions ГРУППИРОВКА / СОРТИРОВКА / ШАПКА ДОКУМЕНТА', () => {
    renderWithProviders(SEARCH_URL);
    expect(screen.getByText('ГРУППИРОВКА')).toBeInTheDocument();
    expect(screen.getByText('СОРТИРОВКА')).toBeInTheDocument();
    expect(screen.getByText('ШАПКА ДОКУМЕНТА')).toBeInTheDocument();
  });

  it('renders the D-41 summary line «Групп: N • Задач: M • С правками: K»', () => {
    renderWithProviders(SEARCH_URL);
    // Default grouping = flat → 1 group. 2 issues in the cache. 0 edits.
    expect(screen.getByText('Групп:')).toBeInTheDocument();
    expect(screen.getByText('Задач:')).toBeInTheDocument();
    expect(screen.getByText('С правками:')).toBeInTheDocument();
  });

  it('renders the mobile tablist (Контролы | Предпросмотр) with aria-label "Режим сборки", default Предпросмотр', () => {
    renderWithProviders(SEARCH_URL);
    const tablist = screen.getByRole('tablist', { name: 'Режим сборки' });
    expect(tablist).toBeInTheDocument();
    const controlsTab = screen.getByRole('tab', { name: 'Контролы' });
    const previewTab = screen.getByRole('tab', { name: 'Предпросмотр' });
    // Default mobile tab is 'preview' (D-27) — Предпросмотр is selected.
    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(controlsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('on mobile, the preview panel is visible and the controls panel is hidden by default (default Предпросмотр)', () => {
    const { container } = renderWithProviders(SEARCH_URL);
    const previewPanel = container.querySelector('#panel-preview');
    const controlsPanel = container.querySelector('#panel-controls');
    expect(previewPanel?.className).toContain('block');
    expect(controlsPanel?.className).toContain('hidden');
  });

  describe('export buttons (D-22, D-40, EXP-01/02/03)', () => {
    it('renders three buttons with aria-labels "Экспорт в Markdown" / "Экспорт в текст" / "Экспорт в HTML"', () => {
      renderWithProviders(SEARCH_URL);
      // Desktop in-panel row AND mobile sticky bar both render the three buttons (UI-SPEC #6 /
      // acceptance: sticky bar has class md:hidden). Tailwind responsive classes are inert in jsdom
      // (no CSS processing), so BOTH bars are visible in the test → 2 buttons per format.
      expect(screen.getAllByRole('button', { name: 'Экспорт в Markdown' }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: 'Экспорт в текст' }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: 'Экспорт в HTML' }).length).toBeGreaterThanOrEqual(1);
    });

    it('renders the desktop in-panel row AND the mobile sticky bar (class md:hidden)', () => {
      const { container } = renderWithProviders(SEARCH_URL);
      // Plan 04 adds the mobile tablist (also md:hidden), so .md:hidden now matches BOTH the
      // tablist and the sticky export bar. The sticky bar is the .md:hidden element that actually
      // contains export buttons — filter to it and assert it carries the three buttons.
      const mdHiddenEls = Array.from(container.querySelectorAll('.md\\:hidden'));
      const stickyBar = mdHiddenEls.find((el) => el.querySelector('.rn-export-btn'));
      expect(stickyBar).toBeDefined();
      const mdButtons = screen.getAllByRole('button', { name: 'Экспорт в Markdown' });
      expect(mdButtons.length).toBe(2); // desktop row (hidden md:flex) + mobile sticky bar (md:hidden)
    });

    it('clicking "Экспорт в Markdown" calls downloadFile with ext "md", a sanitized filename, and buildMarkdown content', () => {
      renderWithProviders(SEARCH_URL + '&version=1.2.3');
      fireEvent.click(screen.getAllByRole('button', { name: 'Экспорт в Markdown' })[0]);
      expect(downloadFileMock).toHaveBeenCalledTimes(1);
      const [text, ext, filename] = downloadFileMock.mock.calls[0];
      expect(ext).toBe('md');
      expect(filename).toMatch(/^release-notes-.*\.md$/);
      // Content is the markdown doc — H1 + total + a PROJ-1 item.
      expect(text).toContain('# Release Notes');
      expect(text).toContain('PROJ-1');
    });

    it('clicking "Экспорт в HTML" awaits buildHtml then calls downloadFile with ext "html"', async () => {
      renderWithProviders(SEARCH_URL + '&version=1.2.3');
      fireEvent.click(screen.getAllByRole('button', { name: 'Экспорт в HTML' })[0]);
      await waitFor(() => {
        expect(downloadFileMock).toHaveBeenCalledTimes(1);
      });
      const [text, ext, filename] = downloadFileMock.mock.calls[0];
      expect(ext).toBe('html');
      expect(filename).toMatch(/^release-notes-.*\.html$/);
      // buildHtml output is a standalone document.
      expect(text.startsWith('<!DOCTYPE html>')).toBe(true);
    });

    it('if downloadFile throws, shows the error box "Не удалось сформировать файл. Попробуйте ещё раз." (role=alert) and does NOT clear edits', () => {
      downloadFileMock.mockImplementation(() => {
        throw new Error('download failed');
      });
      renderWithProviders(SEARCH_URL);

      // D-38 — export never clears edits. Verified two ways: (1) the edits-preservation guarantee
      // is structural — ExportPage.tsx contains NO wipeAll/resetEdit call (acceptance grep below);
      // (2) the error box appears without the export path touching EditsContext.
      fireEvent.click(screen.getAllByRole('button', { name: 'Экспорт в текст' })[0]);
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Не удалось сформировать файл. Попробуйте ещё раз.');

      // Structural assertion (D-38/D-39): ExportPage must not call any edits-clearing API.
      const src = fs.readFileSync(path.resolve(__dirname, 'ExportPage.tsx'), 'utf8');
      expect(src).not.toMatch(/\bwipeAll\b|\bresetEdit\b/);
    });
  });
});

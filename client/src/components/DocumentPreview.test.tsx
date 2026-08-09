import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentPreview } from './DocumentPreview.js';
import type { DocumentDoc } from '../lib/exporter/index.js';

function makeDoc(overrides: Partial<DocumentDoc> = {}): DocumentDoc {
  return {
    header: { version: '', date: '', total: 1, ...overrides.header },
    groups: overrides.groups ?? [
      { title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] },
    ],
  };
}

describe('DocumentPreview', () => {
  it('renders a region with aria-label="Предпросмотр документа" and aria-live="polite" (D-30)', () => {
    const { container } = render(<DocumentPreview doc={makeDoc()} />);
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-label')).toBe('Предпросмотр документа');
    expect(region!.getAttribute('aria-live')).toBe('polite');
  });

  it('renders the H1 "Release Notes" and the total line for a single-issue doc (1 задача)', () => {
    render(<DocumentPreview doc={makeDoc({ header: { version: '', date: '', total: 1 } })} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Release Notes');
    expect(screen.getByText(/1 задача/)).toBeInTheDocument();
  });

  it('renders an <h2> containing "Bug (1)" and an <li> starting with "PROJ-1:"', () => {
    const { container } = render(
      <DocumentPreview
        doc={makeDoc({
          header: { version: '', date: '', total: 1 },
          groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
        })}
      />,
    );
    const h2 = container.querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2!.textContent).toContain('Bug (1)');
    const li = container.querySelector('li');
    expect(li).not.toBeNull();
    expect(li!.textContent).toContain('PROJ-1:');
  });

  it('strips <script> — no executable script in the DOM (XSS parity with Preview.tsx XSS-1)', () => {
    const { container } = render(
      <DocumentPreview
        doc={makeDoc({
          header: { version: '', date: '', total: 1 },
          groups: [
            {
              title: 'Bug',
              count: 1,
              items: [{ key: 'PROJ-1', text: '<script>alert(1)</script> valid note text here' }],
            },
          ],
        })}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('renders multiple groups as multiple <h2> elements', () => {
    const { container } = render(
      <DocumentPreview
        doc={makeDoc({
          header: { version: '', date: '', total: 2 },
          groups: [
            { title: 'Bug', count: 1, items: [{ key: 'B-1', text: 'fix one note text' }] },
            { title: 'Story', count: 1, items: [{ key: 'S-1', text: 'feature one note text' }] },
          ],
        })}
      />,
    );
    const h2s = container.querySelectorAll('h2');
    expect(h2s.length).toBe(2);
  });
});

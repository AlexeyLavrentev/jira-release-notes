import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Preview } from './Preview.js';

describe('Preview', () => {
  it('renders bold as <strong>', () => {
    const { container } = render(<Preview text="**bold**" />);
    expect(container.querySelector('strong')).not.toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders a GFM table with header + body cells', () => {
    const { container } = render(<Preview text={'| a | b |\n|---|---|\n| 1 | 2 |'} />);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelectorAll('td').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders a GFM task list with two checkboxes', () => {
    const { container } = render(<Preview text={'- [ ] todo\n- [x] done'} />);
    expect(container.querySelectorAll('input[type=checkbox]').length).toBe(2);
  });

  it('renders GFM strikethrough as <del>', () => {
    const { container } = render(<Preview text="~~struck~~" />);
    expect(container.querySelector('del')).not.toBeNull();
  });

  it('strips <script> tags — no executable script in the DOM (XSS-1)', () => {
    const { container } = render(<Preview text="<script>alert(1)</script>" />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('strips <img onerror> — no img-with-onerror in the DOM (XSS-1b)', () => {
    const { container } = render(<Preview text="<img src=x onerror=alert(1)>" />);
    const imgs = container.querySelectorAll('img');
    imgs.forEach((img) => {
      expect(img.getAttribute('onerror')).toBeNull();
    });
  });

  it('strips javascript: link URLs (XSS-1c)', () => {
    const { container } = render(<Preview text="[x](javascript:alert(1))" />);
    const anchors = container.querySelectorAll('a');
    anchors.forEach((a) => {
      expect(a.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    });
    // react-markdown renders an untrusted javascript: link as plain text (no <a>), which also passes
  });

  it('shows the empty-state message when text is blank (D-12)', () => {
    render(<Preview text="" />);
    expect(screen.getByText('Заметка пуста — заполните поле выше')).toBeInTheDocument();
  });

  it('shows the empty-state message when text is whitespace-only (D-12)', () => {
    render(<Preview text={'   \n  '} />);
    expect(screen.getByText('Заметка пуста — заполните поле выше')).toBeInTheDocument();
  });
});

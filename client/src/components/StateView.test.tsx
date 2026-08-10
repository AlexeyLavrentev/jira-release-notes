import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateView } from './StateView.js';

/**
 * StateView (CONTEXT.md D-13) — the single shared empty/loading/error/connected component.
 * One pattern: icon (semantic color) + heading (font-md/600) + description (text-muted) +
 * optional CTA. Loading renders 3 shimmer bars instead of a static skeleton block.
 */
describe('StateView', () => {
  describe('variant="empty"', () => {
    it('renders heading, description, and the caller-provided CTA', () => {
      render(
        <StateView
          variant="empty"
          icon={<span data-testid="i" />}
          heading="H"
          description="D"
          cta={<button>Go</button>}
          data-testid="sv"
        />,
      );
      expect(screen.getByTestId('i')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    });

    it('container is centered (textAlign: center) via inline style', () => {
      render(
        <StateView
          variant="empty"
          icon={<span />}
          heading="H"
          data-testid="sv"
        />,
      );
      const container = screen.getByTestId('sv');
      // Inline style survives serialization in jsdom — the exact camelCase token is written
      // to the style attribute as `text-align: center`.
      const styleAttr = container.getAttribute('style') ?? '';
      expect(styleAttr).toContain('text-align: center');
    });

    it('renders NO button when no CTA is passed', () => {
      render(<StateView variant="empty" icon={<span />} heading="H" description="D" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('variant="error"', () => {
    it('container carries role="alert"', () => {
      render(
        <StateView
          variant="error"
          heading="Не удалось загрузить"
          data-testid="sv"
        />,
      );
      const container = screen.getByTestId('sv');
      expect(container).toHaveAttribute('role', 'alert');
    });

    it('defaults to a red AlertCircle icon when no icon is provided', () => {
      // lucide icons render an <svg> with aria-hidden="true"; assert the svg is present.
      const { container } = render(<StateView variant="error" heading="err" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('variant="loading"', () => {
    it('container has aria-busy="true"', () => {
      render(<StateView variant="loading" heading="Загрузка" data-testid="sv" />);
      expect(screen.getByTestId('sv')).toHaveAttribute('aria-busy', 'true');
    });

    it('renders exactly three shimmer bars with the rn-shimmer class', () => {
      const { container } = render(<StateView variant="loading" heading="Загрузка" />);
      const bars = container.querySelectorAll('.rn-shimmer');
      expect(bars.length).toBe(3);
    });

    it('exposes the heading via aria-label on the loading wrapper', () => {
      render(<StateView variant="loading" heading="Загрузка" data-testid="sv" />);
      expect(screen.getByTestId('sv')).toHaveAttribute('aria-label', 'Загрузка');
    });
  });

  describe('variant="connected"', () => {
    it('renders heading + description + CTA like empty, without role=alert', () => {
      render(
        <StateView
          variant="connected"
          heading="Готово"
          description="Можно продолжать"
          cta={<button>К задачам</button>}
          data-testid="sv"
        />,
      );
      expect(screen.getByText('Готово')).toBeInTheDocument();
      expect(screen.getByText('Можно продолжать')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'К задачам' })).toBeInTheDocument();
      expect(screen.getByTestId('sv')).not.toHaveAttribute('role', 'alert');
    });

    it('defaults to a green CheckCircle icon when no icon is provided', () => {
      const { container } = render(<StateView variant="connected" heading="ok" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });
});

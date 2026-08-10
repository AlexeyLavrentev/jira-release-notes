import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next-themes so the toggle resolves a deterministic theme without the
// ThemeProvider. Default mock returns theme='system' (matches defaultTheme).
const setTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme }),
}));

import { ThemeToggle } from './ThemeToggle.js';

describe('ThemeToggle (UI-02, D-01/D-02)', () => {
  // The module-level spy accumulates calls across tests; clear it so each
  // assertion sees only its own render's calls.
  beforeEach(() => {
    setTheme.mockClear();
  });
  it('renders three buttons with the Russian aria-labels (Светлая/Системная/Тёмная)', () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText('Светлая')).toBeInTheDocument();
    expect(screen.getByLabelText('Системная')).toBeInTheDocument();
    expect(screen.getByLabelText('Тёмная')).toBeInTheDocument();
  });

  it('marks the active button aria-pressed=true (matches mocked theme="system")', () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText('Системная')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // the other two are not pressed
    expect(screen.getByLabelText('Светлая')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByLabelText('Тёмная')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('clicking "Тёмная" calls setTheme("dark")', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByLabelText('Тёмная'));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('clicking the active button calls setTheme with the same value (idempotent, not a cycle)', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByLabelText('Системная'));
    // Same value, not rotated to a different theme — setTheme("system") not ("dark")
    expect(setTheme).toHaveBeenCalledWith('system');
    expect(setTheme).not.toHaveBeenCalledWith('dark');
  });

  it('renders icons as inline SVG, never <img> (UI-03: lucide bundled, no HTTP)', () => {
    const { container } = render(<ThemeToggle />);
    expect(container.querySelector('img')).toBeNull();
    // lucide renders inline <svg>
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3);
  });

  it('wraps the buttons in a role=group aria-label="Оформление" container', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('group', { name: 'Оформление' })).toBeInTheDocument();
  });
});

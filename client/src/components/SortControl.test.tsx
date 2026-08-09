import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortControl } from './SortControl.js';
import type { ExportSortKey } from '../lib/exporter/types.js';
import type { SortDirection } from '../lib/sort.js';

describe('SortControl', () => {
  it('renders a native <select> with aria-label "Сортировка внутри групп" and three options', () => {
    render(<SortControl value="priority" dir="desc" onValueChange={() => {}} onDirChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: 'Сортировка внутри групп' });
    expect(select).not.toBeNull();
    // Three labelled options
    expect(screen.getByText('Приоритет')).toBeInTheDocument();
    expect(screen.getByText('Дата закрытия')).toBeInTheDocument();
    expect(screen.getByText('Ключ')).toBeInTheDocument();
  });

  it('the direction toggle is a button with aria-label "Направление сортировки" and aria-pressed=false when dir="asc"', () => {
    render(<SortControl value="priority" dir="asc" onValueChange={() => {}} onDirChange={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Направление сортировки' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('the direction toggle has aria-pressed=true when dir="desc"', () => {
    render(<SortControl value="priority" dir="desc" onValueChange={() => {}} onDirChange={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Направление сортировки' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggle title is "По убыванию" for desc and "По возрастанию" for asc', () => {
    const { rerender } = render(
      <SortControl value="priority" dir="desc" onValueChange={() => {}} onDirChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Направление сортировки' }).getAttribute('title')).toBe(
      'По убыванию',
    );
    rerender(
      <SortControl value="priority" dir="asc" onValueChange={() => {}} onDirChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Направление сортировки' }).getAttribute('title')).toBe(
      'По возрастанию',
    );
  });

  it('changing the select calls onValueChange with the new ExportSortKey', () => {
    const onValueChange = vi.fn();
    render(<SortControl value="priority" dir="desc" onValueChange={onValueChange} onDirChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: 'Сортировка внутри групп' });
    fireEvent.change(select, { target: { value: 'resolutiondate' } });
    expect(onValueChange).toHaveBeenCalledWith('resolutiondate');
  });

  it('clicking the direction toggle calls onDirChange flipping desc → asc', () => {
    const onDirChange = vi.fn();
    render(<SortControl value="priority" dir="desc" onValueChange={() => {}} onDirChange={onDirChange} />);
    const toggle = screen.getByRole('button', { name: 'Направление сортировки' });
    fireEvent.click(toggle);
    expect(onDirChange).toHaveBeenCalledWith('asc');
  });

  it('clicking the direction toggle when asc calls onDirChange with desc', () => {
    const onDirChange = vi.fn();
    render(
      <SortControl
        value="priority"
        dir="asc"
        onValueChange={() => {}}
        onDirChange={onDirChange}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Направление сортировки' });
    fireEvent.click(toggle);
    expect(onDirChange).toHaveBeenCalledWith('desc');
  });

  it('typing: ExportSortKey and SortDirection are accepted by props (compile-time guarantee)', () => {
    // This test exists to lock the prop types at the type level; if it compiles it passes.
    const _value: ExportSortKey = 'priority';
    const _dir: SortDirection = 'desc';
    expect(_value).toBe('priority');
    expect(_dir).toBe('desc');
  });
});

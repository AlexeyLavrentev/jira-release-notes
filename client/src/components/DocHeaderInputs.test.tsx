import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocHeaderInputs } from './DocHeaderInputs.js';

describe('DocHeaderInputs', () => {
  it('renders two <label>/<input> pairs', () => {
    const { container } = render(
      <DocHeaderInputs version="" date="" onVersionChange={() => {}} onDateChange={() => {}} />,
    );
    const labels = container.querySelectorAll('label');
    const inputs = container.querySelectorAll('input');
    expect(labels.length).toBe(2);
    expect(inputs.length).toBe(2);
  });

  it('version input has placeholder "например, 1.2.3" and type="text"', () => {
    render(<DocHeaderInputs version="" date="" onVersionChange={() => {}} onDateChange={() => {}} />);
    const versionInput = screen.getByPlaceholderText('например, 1.2.3');
    expect(versionInput).not.toBeNull();
    expect(versionInput.getAttribute('type')).toBe('text');
  });

  it('date input has type="date"', () => {
    const { container } = render(
      <DocHeaderInputs version="" date="" onVersionChange={() => {}} onDateChange={() => {}} />,
    );
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
  });

  it('labels are "Версия" and "Дата"', () => {
    render(<DocHeaderInputs version="" date="" onVersionChange={() => {}} onDateChange={() => {}} />);
    expect(screen.getByText('Версия')).toBeInTheDocument();
    expect(screen.getByText('Дата')).toBeInTheDocument();
  });

  it('each <label htmlFor> resolves to its <input id> association', () => {
    const { container } = render(
      <DocHeaderInputs version="" date="" onVersionChange={() => {}} onDateChange={() => {}} />,
    );
    const labels = Array.from(container.querySelectorAll('label'));
    for (const label of labels) {
      const htmlFor = label.getAttribute('for');
      expect(htmlFor).toBeTruthy();
      const associated = container.querySelector(`#${htmlFor}`);
      expect(associated).not.toBeNull();
      expect(associated!.tagName.toLowerCase()).toBe('input');
    }
  });

  it('typing in the version input calls onVersionChange with the new value', () => {
    const onVersionChange = vi.fn();
    render(
      <DocHeaderInputs
        version=""
        date=""
        onVersionChange={onVersionChange}
        onDateChange={() => {}}
      />,
    );
    const versionInput = screen.getByPlaceholderText('например, 1.2.3');
    fireEvent.change(versionInput, { target: { value: '1.2.3' } });
    expect(onVersionChange).toHaveBeenCalledWith('1.2.3');
  });

  it('changing the date calls onDateChange with the new value', () => {
    const onDateChange = vi.fn();
    const { container } = render(
      <DocHeaderInputs
        version=""
        date=""
        onVersionChange={() => {}}
        onDateChange={onDateChange}
      />,
    );
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-08-09' } });
    expect(onDateChange).toHaveBeenCalledWith('2026-08-09');
  });
});

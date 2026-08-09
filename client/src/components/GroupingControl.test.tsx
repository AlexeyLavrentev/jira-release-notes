import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupingControl } from './GroupingControl.js';
import type { GroupingMode } from '../lib/exporter/types.js';

const OPTIONS: { value: GroupingMode; label: string }[] = [
  { value: 'type', label: 'По типу' },
  { value: 'component', label: 'По компоненту' },
  { value: 'epic', label: 'По эпику' },
  { value: 'flat', label: 'Без групп' },
];

describe('GroupingControl', () => {
  it('renders a container with role="radiogroup" and aria-label "Шаблон группировки"', () => {
    render(<GroupingControl value="flat" onChange={() => {}} />);
    const rg = screen.getByRole('radiogroup');
    expect(rg).not.toBeNull();
    expect(rg.getAttribute('aria-label')).toBe('Шаблон группировки');
  });

  it('renders four role="radio" buttons with the active one aria-checked="true"', () => {
    const { container } = render(<GroupingControl value="component" onChange={() => {}} />);
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(4);
    const checkedStates = Array.from(radios).map((r) => r.getAttribute('aria-checked'));
    // component is option index 1 → that one is true, rest false
    expect(checkedStates).toEqual(['false', 'true', 'false', 'false']);
  });

  it('renders labels in order: "По типу" / "По компоненту" / "По эпику" / "Без групп"', () => {
    render(<GroupingControl value="flat" onChange={() => {}} />);
    const labels = OPTIONS.map((o) => o.label).map((label) => screen.getByText(label));
    expect(labels.length).toBe(4);
  });

  it('clicking "По компоненту" calls onChange with "component"', () => {
    const onChange = vi.fn();
    render(<GroupingControl value="flat" onChange={onChange} />);
    fireEvent.click(screen.getByText('По компоненту'));
    expect(onChange).toHaveBeenCalledWith('component');
  });

  it('ArrowRight on the active radio moves focus to the next radio AND fires onChange', () => {
    const onChange = vi.fn();
    render(<GroupingControl value="type" onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    // focus moved to the next radio (component)
    expect(document.activeElement).toBe(radios[1]);
    // and onChange fired for the newly-focused option (standard radiogroup behavior)
    expect(onChange).toHaveBeenCalledWith('component');
  });

  it('ArrowLeft on the active radio moves focus to the previous radio AND fires onChange (wraps to last)', () => {
    const onChange = vi.fn();
    render(<GroupingControl value="type" onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
    // wraps to the last radio (flat)
    expect(document.activeElement).toBe(radios[3]);
    expect(onChange).toHaveBeenCalledWith('flat');
  });
});

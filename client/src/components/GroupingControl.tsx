import { useRef } from 'react';
import type { GroupingMode } from '../lib/exporter/types.js';

interface GroupingControlProps {
  value: GroupingMode;
  onChange: (m: GroupingMode) => void;
}

/** D-07 — the four grouping templates, in display order. */
const OPTIONS: { value: GroupingMode; label: string }[] = [
  { value: 'type', label: 'По типу' },
  { value: 'component', label: 'По компоненту' },
  { value: 'epic', label: 'По эпику' },
  { value: 'flat', label: 'Без групп' },
];

/**
 * ValidationFilter-exact segmented button style (D-07 / UI-SPEC #3), upgraded to a radiogroup
 * per D-29. `active` controls accent surface + white text vs surface + body text.
 */
function segmentedBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text)',
    fontSize: 'var(--font-xs)',
    cursor: 'pointer',
  };
}

/**
 * GroupingControl — a roving-tabindex radiogroup (D-29 full a11y). Arrow keys move focus AND
 * select (standard WAI-ARIA radiogroup behavior): ArrowRight/ArrowDown → next option (wraps to
 * first), ArrowLeft/ArrowUp → previous (wraps to last). Controlled — no internal state.
 */
export function GroupingControl({ value, onChange }: GroupingControlProps) {
  const refs = useRef<HTMLButtonElement[]>([]);

  const focusOption = (index: number) => {
    const wrapped = (index + OPTIONS.length) % OPTIONS.length;
    const el = refs.current[wrapped];
    if (el) {
      el.focus();
      onChange(OPTIONS[wrapped].value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusOption(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusOption(index - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Шаблон группировки"
      style={{ display: 'flex', gap: 'var(--space-1)' }}
    >
      {OPTIONS.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          style={segmentedBtnStyle(value === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { segmentedBtnStyle };

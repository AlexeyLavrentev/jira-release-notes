import type { CategoryCounts } from '../lib/validation.js';
import type { ValidationFilterMode } from '../lib/validation.js';

interface ValidationFilterProps {
  counts: CategoryCounts;
  activeFilter: ValidationFilterMode;
  onFilterChange: (mode: ValidationFilterMode) => void;
}

const FILTERS: { value: ValidationFilterMode; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'problematic', label: 'Только проблемные' },
  { value: 'valid', label: 'Только валидные' },
];

/**
 * Segmented filter + counters (D-33, D-34).
 */
export function ValidationFilter({ counts, activeFilter, onFilterChange }: ValidationFilterProps) {
  return (
    <div role="group" aria-label="Фильтр валидации" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
      {/* Segmented (D-33) */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-label={f.label}
            onClick={() => onFilterChange(f.value)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: activeFilter === f.value ? 'var(--accent)' : 'var(--surface)',
              color: activeFilter === f.value ? '#fff' : 'var(--text)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Counters (D-34) */}
      <div style={{ fontSize: '0.8125rem', display: 'flex', gap: '0.75rem' }}>
        <span>Всего: <strong>{counts.total}</strong></span>
        {counts.empty > 0 && <span style={{ color: 'var(--error)' }}>Пустых: <strong>{counts.empty}</strong></span>}
        {counts.short > 0 && <span style={{ color: 'var(--warning)' }}>Коротких: <strong>{counts.short}</strong></span>}
        {counts.placeholder > 0 && <span style={{ color: '#ff9500' }}>Заглушек: <strong>{counts.placeholder}</strong></span>}
      </div>
    </div>
  );
}

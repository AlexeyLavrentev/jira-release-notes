import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ExportSortKey } from '../lib/exporter/types.js';
import type { SortDirection } from '../lib/sort.js';

interface SortControlProps {
  value: ExportSortKey;
  dir: SortDirection;
  onValueChange: (k: ExportSortKey) => void;
  onDirChange: (d: SortDirection) => void;
}

/**
 * Direction toggle button — matches EditPage.navBtnStyle (36x36, border 1px solid var(--border),
 * background var(--surface), borderRadius 8, inline-flex centered). Icon conveys the active
 * direction: ArrowDown when descending (default), ArrowUp when ascending.
 */
const toggleBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  borderRadius: 8,
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.9375rem',
};

/**
 * SortControl — D-08: a native <select> (priority / resolutiondate / key — free mobile picker +
 * a11y) + a direction toggle button next to it. Controlled — value/dir come from the parent and
 * are surfaced via onValueChange / onDirChange.
 */
export function SortControl({ value, dir, onValueChange, onDirChange }: SortControlProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        aria-label="Сортировка внутри групп"
        value={value}
        onChange={(e) => onValueChange(e.target.value as ExportSortKey)}
        style={selectStyle}
      >
        <option value="priority">Приоритет</option>
        <option value="resolutiondate">Дата закрытия</option>
        <option value="key">Ключ</option>
      </select>
      <button
        type="button"
        aria-label="Направление сортировки"
        aria-pressed={dir === 'desc'}
        title={dir === 'desc' ? 'По убыванию' : 'По возрастанию'}
        onClick={() => onDirChange(dir === 'desc' ? 'asc' : 'desc')}
        style={toggleBtnStyle}
      >
        {dir === 'desc' ? <ArrowDown size={18} aria-hidden="true" /> : <ArrowUp size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}

export { selectStyle as sortSelectStyle };

interface DocHeaderInputsProps {
  version: string;
  date: string;
  onVersionChange: (v: string) => void;
  onDateChange: (d: string) => void;
}

/**
 * Input styling parity with the SortControl <select> (UI-SPEC #5): border/radius/padding/bg/font.
 */
const inputStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.9375rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.8125rem',
  color: 'var(--text-muted)',
};

/**
 * DocHeaderInputs — D-17: two labeled inputs inline (gap 16). «Версия» text input with placeholder
 * and «Дата» native date input. Each label is htmlFor-associated to its input id for free a11y.
 * Controlled — values come from the parent and are surfaced via onVersionChange / onDateChange.
 */
export function DocHeaderInputs({ version, date, onVersionChange, onDateChange }: DocHeaderInputsProps) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <label htmlFor="rn-doc-version" style={labelStyle}>
          Версия
        </label>
        <input
          id="rn-doc-version"
          type="text"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
          placeholder="например, 1.2.3"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="rn-doc-date" style={labelStyle}>
          Дата
        </label>
        <input
          id="rn-doc-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

export { inputStyle as docInputStyle };

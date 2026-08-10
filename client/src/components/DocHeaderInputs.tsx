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
  /* 0.375rem (6px) vertical — input-vpadding exception, not on the 8pt scale (05-UI-SPEC). */
  padding: '0.375rem var(--space-3)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 'var(--font-md)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-1)',
  fontSize: 'var(--font-xs)',
  color: 'var(--text-muted)',
};

/**
 * DocHeaderInputs — D-17: two labeled inputs inline (gap 16). «Версия» text input with placeholder
 * and «Дата» native date input. Each label is htmlFor-associated to its input id for free a11y.
 * Controlled — values come from the parent and are surfaced via onVersionChange / onDateChange.
 */
export function DocHeaderInputs({ version, date, onVersionChange, onDateChange }: DocHeaderInputsProps) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
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

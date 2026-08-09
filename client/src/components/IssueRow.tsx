import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Issue } from '../../../shared/types/issue';
import type { ValidationCategory } from '../lib/validation.js';

interface IssueRowProps {
  issue: Issue;
  category: ValidationCategory;
}

const ROW_BG: Record<ValidationCategory, string> = {
  empty: 'rgba(255,59,48,0.06)',
  short: 'rgba(255,159,10,0.06)',
  placeholder: 'rgba(255,149,0,0.06)',
  valid: 'transparent',
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'var(--error)',
  High: 'var(--error)',
  Medium: 'var(--warning)',
  Low: 'var(--text-muted)',
  Lowest: 'var(--text-muted)',
};

const FLAG_LABEL: Record<ValidationCategory, string> = {
  empty: 'Пустое поле release note',
  short: 'Слишком короткий release note',
  placeholder: 'Заглушка в release note',
  valid: 'Валидный release note',
};

/**
 * Issue row with validation coloring, flag icon, Badges, and expandable detail (D-22, D-25..D-28, D-32, D-38).
 */
export function IssueRow({ issue, category }: IssueRowProps) {
  const [expanded, setExpanded] = useState(false);

  function FlagIcon() {
    const size = 16;
    if (category === 'empty') return <AlertCircle size={size} color="var(--error)" aria-label={FLAG_LABEL[category]} />;
    if (category === 'short') return <AlertTriangle size={size} color="var(--warning)" aria-label={FLAG_LABEL[category]} />;
    if (category === 'placeholder') return <AlertTriangle size={size} color="#ff9500" aria-label={FLAG_LABEL[category]} />;
    return <CheckCircle size={size} color="var(--success)" aria-label={FLAG_LABEL[category]} />;
  }

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{ borderBottom: '1px solid var(--border)', background: ROW_BG[category], cursor: 'pointer' }}
      >
        <td style={cellStyle}>
          <code style={{ fontSize: '0.75rem' }}>{issue.key}</code>
        </td>
        <td style={cellStyle}>{issue.summary}</td>
        <td style={cellStyle}>
          {issue.issuetype.iconUrl && (
            <img src={issue.issuetype.iconUrl} alt="" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} />
          )}
          {issue.issuetype.name}
        </td>
        <td style={cellStyle}>{issue.status.name}</td>
        <td style={cellStyle}>
          {issue.priority && (
            <Badge color={PRIORITY_COLORS[issue.priority.name] ?? 'var(--text-muted)'}>{issue.priority.name}</Badge>
          )}
        </td>
        <td style={cellStyle}>
          {issue.components.length > 0
            ? issue.components.map((c) => <Badge key={c.id} color="var(--text-muted)">{c.name}</Badge>)
            : '—'}
        </td>
        <td style={cellStyle}>
          {issue.fixVersions.length > 0
            ? issue.fixVersions.map((v) => (
                <Badge key={v.id} color={v.released ? 'var(--success)' : 'var(--text-muted)'}>{v.name}</Badge>
              ))
            : '—'}
        </td>
        <td title={issue.releaseNote} style={cellStyle}>
          {issue.releaseNote.length > 80 ? issue.releaseNote.slice(0, 80) + '…' : issue.releaseNote || '—'}
        </td>
        <td style={cellStyle}>
          <FlagIcon />
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--bg)' }}>
          <td colSpan={9} style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
              <div>
                <strong>Release Note:</strong>
                <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{issue.releaseNote || '(пусто)'}</p>
              </div>
              <div>
                {issue.epic && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Эпик:</strong> <code>{issue.epic.key}</code>
                    {issue.epic.summary ? ` — ${issue.epic.summary}` : ''}
                  </div>
                )}
                {issue.components.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Компоненты:</strong> {issue.components.map((c) => c.name).join(', ')}
                  </div>
                )}
                {issue.fixVersions.length > 0 && (
                  <div>
                    <strong>Fix Versions:</strong> {issue.fixVersions.map((v) => v.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const cellStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  verticalAlign: 'top',
  fontSize: '0.8125rem',
};

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.125rem 0.5rem',
        borderRadius: 4,
        background: `${color}20`,
        color: color,
        fontSize: '0.75rem',
        fontWeight: 500,
        marginRight: 4,
        marginBottom: 2,
      }}
    >
      {children}
    </span>
  );
}

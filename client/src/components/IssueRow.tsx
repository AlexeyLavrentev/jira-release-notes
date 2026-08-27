import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Ban, CheckCircle, ExternalLink, Pencil } from 'lucide-react';
import type { Issue } from '../../../shared/types/issue';
import type { ValidationCategory } from '../lib/validation.js';
import { getIssueTypeIcon } from '../lib/issueTypeIcons.js';
import { useEdits } from '../context/EditsContext.js';

interface IssueRowProps {
  issue: Issue;
  category: ValidationCategory;
}

const ROW_BG: Record<ValidationCategory, string> = {
  empty: 'rgba(255,59,48,0.06)',
  short: 'rgba(255,159,10,0.06)',
  placeholder: 'rgba(255,149,0,0.06)',
  skip: 'transparent', // D-08 — no highlight, skip is intentional (not a problem)
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
  skip: 'Пропущено (маркер <no-release-notes>)',
  valid: 'Валидный release note',
};

/**
 * Issue row with validation coloring, flag icon, Badges, and expandable detail (D-22, D-25..D-28, D-32, D-38).
 */
export function IssueRow({ issue, category }: IssueRowProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { edits } = useEdits();
  // D-17: edits map is NEVER cleared on search/project change — isEdited is recomputed per row
  // from the shared context map.
  const isEdited = Object.prototype.hasOwnProperty.call(edits, issue.key);
  // UI-03 (D-04, D-05): issuetype icon from the centralized lucide mapping + semantic color.
  const { Icon: TypeIcon, color: typeColor } = getIssueTypeIcon(issue.issuetype.name);

  function FlagIcon() {
    const size = 16;
    if (category === 'empty') return <AlertCircle size={size} color="var(--error)" aria-label={FLAG_LABEL[category]} />;
    if (category === 'short') return <AlertTriangle size={size} color="var(--warning)" aria-label={FLAG_LABEL[category]} />;
    if (category === 'placeholder') return <AlertTriangle size={size} color="#ff9500" aria-label={FLAG_LABEL[category]} />;
    if (category === 'skip')
      return <Ban size={size} color="var(--text-tertiary)" aria-label={FLAG_LABEL[category]} />; // D-09
    return <CheckCircle size={size} color="var(--success)" aria-label={FLAG_LABEL[category]} />;
  }

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          borderBottom: '1px solid var(--border)',
          background: ROW_BG[category],
          cursor: 'pointer',
          // D-07 — visual demotion for skip (intentional drop). The row stays clickable/expandable.
          ...(category === 'skip' ? { opacity: 0.5 } : {}),
        }}
      >
        <td style={cellStyle}>
          <code style={{ fontSize: '0.75rem' }}>{issue.key}</code>
          {isEdited && (
            <span title="Отредактировано" aria-label="Отредактировано" style={{ marginLeft: 4, verticalAlign: 'middle', color: 'var(--accent)' }}>
              <Pencil size={12} aria-hidden="true" style={{ verticalAlign: 'middle' }} />
            </span>
          )}
        </td>
        <td style={{ ...cellStyle, ...(category === 'skip' ? { textDecoration: 'line-through' } : {}) }}>
          {issue.summary}
        </td>
        {/* D-15 — secondary columns carry `hidden md:table-cell` to match IssueTable's <th>; the
            table↔card switch (md:block / md:hidden) still owns the <sm phone layout. */}
        <td className="hidden md:table-cell" style={cellStyle}>
          <TypeIcon size={16} color={typeColor} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {issue.issuetype.name}
        </td>
        <td className="hidden md:table-cell" style={cellStyle}>{issue.status.name}</td>
        <td className="hidden md:table-cell" style={cellStyle}>
          {issue.priority && (
            <Badge color={PRIORITY_COLORS[issue.priority.name] ?? 'var(--text-muted)'}>{issue.priority.name}</Badge>
          )}
        </td>
        <td className="hidden md:table-cell" style={cellStyle}>
          {issue.components.length > 0
            ? issue.components.map((c) => <Badge key={c.id} color="var(--text-muted)">{c.name}</Badge>)
            : '—'}
        </td>
        <td className="hidden md:table-cell" style={cellStyle}>
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
        <td style={cellStyle}>
          <button
            aria-label={`Редактировать ${issue.key}`}
            onClick={(e) => {
              e.stopPropagation(); // CRITICAL — without it the click toggles the row expand (D-02)
              navigate(`/edit/${issue.key}?${searchParams.toString()}`);
            }}
            style={editBtnStyle}
          >
            <Pencil size={14} aria-hidden="true" /> Редактировать
          </button>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--bg)' }}>
          <td colSpan={10} style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
              <div>
                <strong>Release Note:</strong>
                <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{issue.releaseNote || '(пусто)'}</p>
              </div>
              <div>
                {issue.url && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <a href={issue.url} target="_blank" rel="noreferrer" style={jiraLinkStyle}>
                      <ExternalLink size={12} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
                      Открыть в Jira
                    </a>
                  </div>
                )}
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Автор:</strong> {issue.reporter ?? '—'}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Исполнитель:</strong> {issue.assignee ?? 'не назначен'}
                </div>
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

const editBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '0.25rem 0.625rem',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  borderRadius: 6,
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const jiraLinkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  textDecoration: 'none',
  fontWeight: 500,
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

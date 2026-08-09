import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Issue } from '../../../shared/types/issue';
import type { ValidationCategory } from '../lib/validation.js';

interface MobileIssueCardProps {
  issue: Issue;
  category: ValidationCategory;
}

const CARD_BG: Record<ValidationCategory, string> = {
  empty: 'rgba(255,59,48,0.06)',
  short: 'rgba(255,159,10,0.06)',
  placeholder: 'rgba(255,149,0,0.06)',
  valid: 'transparent',
};

/**
 * Mobile card layout (D-29): stacked fields for <md viewports.
 * Same validation coloring + expand as IssueRow.
 */
export function MobileIssueCard({ issue, category }: MobileIssueCardProps) {
  const [expanded, setExpanded] = useState(false);

  function Flag() {
    const size = 18;
    if (category === 'empty') return <AlertCircle size={size} color="var(--error)" />;
    if (category === 'short') return <AlertTriangle size={size} color="var(--warning)" />;
    if (category === 'placeholder') return <AlertTriangle size={size} color="#ff9500" />;
    return <CheckCircle size={size} color="var(--success)" />;
  }

  return (
    <div
      role="listitem"
      aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}
      style={{
        background: CARD_BG[category],
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1rem',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <Flag />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <code style={{ fontSize: '0.75rem', fontWeight: 600 }}>{issue.key}</code>
            {issue.issuetype.iconUrl && (
              <img src={issue.issuetype.iconUrl} alt="" style={{ width: 14, height: 14, verticalAlign: 'middle' }} />
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{issue.issuetype.name}</span>
          </div>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{issue.summary}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {issue.releaseNote || '(пусто)'}
          </div>
          {expanded && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
              {issue.releaseNote || '(пусто)'}
              {issue.epic && <div style={{ marginTop: '0.25rem' }}>Эпик: <code>{issue.epic.key}</code></div>}
              {issue.components.length > 0 && (
                <div style={{ marginTop: '0.25rem' }}>Компоненты: {issue.components.map((c) => c.name).join(', ')}</div>
              )}
              {issue.fixVersions.length > 0 && (
                <div style={{ marginTop: '0.25rem' }}>Версии: {issue.fixVersions.map((v) => v.name).join(', ')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

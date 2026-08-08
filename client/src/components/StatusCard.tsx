import type { ConfigResponse } from '../../../shared/types/api';

interface StatusCardProps {
  config: ConfigResponse;
}

/**
 * Status card (CONTEXT.md D-29): shows connection metadata with a ✓/✗ badge.
 * role="status" + aria-live for accessibility (D-35).
 */
export function StatusCard({ config }: StatusCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderRadius: 16,
        padding: '2rem',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
        Статус подключения
      </h1>

      <Row label="Подключение">
        <span
          style={{
            color: config.configured ? 'var(--success)' : 'var(--error)',
            fontWeight: 600,
          }}
        >
          {config.configured ? '✓ Подключено' : '✗ Не настроено'}
        </span>
      </Row>

      <Row label="Jira URL">
        <code style={{ fontSize: '0.875rem' }}>{config.jiraBaseUrl}</code>
      </Row>

      <Row label="Поле release note">
        <code style={{ fontSize: '0.875rem' }}>{config.releaseNoteField}</code>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

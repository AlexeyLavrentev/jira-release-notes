import type { ConfigResponse } from '../../../shared/types/api';
import type { ConnectionStatus } from '../../../shared/types/jira';

interface StatusCardProps {
  config: ConfigResponse;
  connectionStatus?: ConnectionStatus;
}

type BadgeState = 'ok' | 'warn' | 'error';

function deriveBadge(conn?: ConnectionStatus): BadgeState {
  if (!conn) return 'warn';
  if (!conn.connected) return 'error';
  if (!conn.meetsPatRequirement) return 'warn';
  return 'ok';
}

const BADGE: Record<BadgeState, { label: string; color: string }> = {
  ok: { label: '✓ Подключено', color: 'var(--success)' },
  warn: { label: '⚠ Внимание', color: 'var(--warning)' },
  error: { label: '✗ Ошибка', color: 'var(--error)' },
};

/**
 * Status card (CONTEXT.md D-29): shows connection metadata + Jira version.
 * role="status" + aria-live for accessibility (D-35).
 */
export function StatusCard({ config, connectionStatus }: StatusCardProps) {
  const badge = deriveBadge(connectionStatus);
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
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
        <span style={{ color: badge.color, fontWeight: 600 }}>{badge.label}</span>
      </Row>

      <Row label="Jira URL">
        <code style={{ fontSize: '0.875rem' }}>{config.jiraBaseUrl}</code>
      </Row>

      {connectionStatus?.jiraVersion && (
        <Row label="Версия Jira">
          <code style={{ fontSize: '0.875rem' }}>{connectionStatus.jiraVersion}</code>
        </Row>
      )}

      <Row label="Поле release note">
        <code style={{ fontSize: '0.875rem' }}>{config.releaseNoteField}</code>
      </Row>

      {connectionStatus?.error && (
        <div
          role="alert"
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg)',
            borderRadius: 10,
            color: 'var(--error)',
            fontSize: '0.875rem',
          }}
        >
          <strong>{connectionStatus.error.message}</strong>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            {connectionStatus.error.hint}
          </p>
        </div>
      )}
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
        gap: '1rem',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}

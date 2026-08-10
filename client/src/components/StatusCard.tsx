import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
  const badgeState = deriveBadge(connectionStatus);
  const badge = BADGE[badgeState];
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

      {/* D-12 — «К задачам» CTA. Fixes the Phase-1 dead-end: a user landing on `/` with a healthy
          connection had no forward navigation. Shown only when the badge resolves to 'ok'
          (connected && meetsPatRequirement) — the same condition that makes the badge green. */}
      {badgeState === 'ok' && (
        <Link
          to="/select"
          aria-label="Перейти к задачам"
          style={ctaStyle}
        >
          К задачам
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/**
 * ctaStyle (D-12) — solid-accent button rendered via a <Link>. Mirrors the buildDocBtnStyle /
 * doneBtnStyle accent treatment (solid --accent bg, #fff text, 600 weight, --radius-md) so the
 * primary forward action reads the same as the other primary CTAs in the flow. The global
 * :focus-visible ring (D-11) and the global 150ms transition (D-10) apply automatically.
 */
const ctaStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-1)',
  marginTop: 'var(--space-5)',
  padding: 'var(--space-2) var(--space-5)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--accent)',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 'var(--font-md)',
  textDecoration: 'none',
  alignSelf: 'center',
};

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

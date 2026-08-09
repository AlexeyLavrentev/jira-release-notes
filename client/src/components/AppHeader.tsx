import { Link } from 'react-router-dom';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';

/**
 * Sticky application header (D-09): logo/name left + connection status Badge right.
 * Click on status → / (status page).
 */
export function AppHeader() {
  const { connectionStatus } = useConnectionStatus();
  const connected = connectionStatus?.connected && connectionStatus.meetsPatRequirement;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600, fontSize: '1rem' }}>
        Jira Release Notes
      </Link>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: connected ? 'var(--success)' : 'var(--error)',
          }}
        >
          {connected ? '✓ Подключено' : '✗ Нет связи'}
        </span>
      </Link>
    </header>
  );
}

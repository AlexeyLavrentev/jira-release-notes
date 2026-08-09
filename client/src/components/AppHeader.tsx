import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';
import { useEdits } from '../context/EditsContext.js';

/**
 * Sticky application header (D-09): logo/name left + connection status Badge right.
 * Click on status → / (status page).
 * Edits badge «N с правками» + «Очистить все правки» (D-21, D-18) when edits exist.
 */
export function AppHeader() {
  const { connectionStatus } = useConnectionStatus();
  const { edits, hasEdits, wipeAll } = useEdits();
  const connected = connectionStatus?.connected && connectionStatus.meetsPatRequirement;
  const editCount = Object.keys(edits).length;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {hasEdits && (
          <>
            <span
              style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {editCount} с правками
            </span>
            <button
              aria-label="Очистить все правки"
              onClick={() => {
                if (window.confirm('Удалить все правки?')) wipeAll();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                borderRadius: 6,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} aria-hidden="true" /> Очистить все правки
            </button>
          </>
        )}
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
      </div>
    </header>
  );
}

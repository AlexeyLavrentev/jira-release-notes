import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';
import { useEdits } from '../context/EditsContext.js';
import { ThemeToggle } from './ThemeToggle.js';

/**
 * Sticky application header (D-09): logo/name left + connection status Badge right.
 * Click on status → / (status page).
 * Edits badge «N с правками» + «Очистить все правки» (D-21, D-18) when edits exist.
 * ThemeToggle (UI-02) mounted as the last child of the right-side action cluster.
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
        padding: 'var(--space-3) var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* 1rem = root default, not a doc-scale size — do not collapse to --font-md (0.9375rem). */}
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600, fontSize: '1rem' }}>
        Jira Release Notes
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {hasEdits && (
          <>
            <span
              style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 'var(--radius-lg)',
                padding: '2px var(--space-2)',
                fontSize: 'var(--font-xs)',
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
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-2)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-xs)',
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
              fontSize: 'var(--font-xs)',
              fontWeight: 500,
              color: connected ? 'var(--success)' : 'var(--error)',
            }}
          >
            {connected ? '✓ Подключено' : '✗ Нет связи'}
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

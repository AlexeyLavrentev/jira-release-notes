import { useConnectionStatus } from '../hooks/useConnectionStatus.js';
import { StatusCard } from '../components/StatusCard.js';

/**
 * Status page (CONTEXT.md D-29, D-34): reads /api/config and shows the StatusCard.
 * Loading → Skeleton; Error → message; Success → StatusCard.
 */
export function StatusPage() {
  const { data, isLoading, error } = useConnectionStatus();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {isLoading ? (
        <Skeleton />
      ) : error ? (
        <ErrorBox message={error instanceof Error ? error.message : 'Ошибка подключения'} />
      ) : data ? (
        <StatusCard config={data} />
      ) : null}
    </main>
  );
}

function Skeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Загрузка"
      style={{
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderRadius: 16,
        padding: '2rem',
        maxWidth: 480,
        width: '100%',
        opacity: 0.6,
      }}
    >
      <div style={{ height: '1.5rem', background: 'var(--border)', borderRadius: 8, marginBottom: '1.5rem' }} />
      <div style={{ height: '1rem', background: 'var(--border)', borderRadius: 6, marginBottom: '0.75rem' }} />
      <div style={{ height: '1rem', background: 'var(--border)', borderRadius: 6, marginBottom: '0.75rem' }} />
      <div style={{ height: '1rem', background: 'var(--border)', borderRadius: 6 }} />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--surface)',
        border: `1px solid var(--error)`,
        borderRadius: 16,
        padding: '2rem',
        maxWidth: 480,
        color: 'var(--error)',
      }}
    >
      <h1 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Не удалось загрузить статус</h1>
      <p style={{ margin: 0 }}>{message}</p>
      <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Проверьте, что приложение запущено и конфигурация задана.
      </p>
    </div>
  );
}

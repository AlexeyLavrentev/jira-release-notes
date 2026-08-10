import { AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';
import { StatusCard } from '../components/StatusCard.js';
import { StateView } from '../components/StateView.js';

/**
 * Status page (CONTEXT.md D-29, D-34): reads /api/config + /api/connection-status.
 * Loading + error states use the shared StateView (D-13); Success → StatusCard with version +
 * error guidance. The StatusCard itself renders the «К задачам» CTA when connected (D-12).
 */
export function StatusPage() {
  const { config, connectionStatus, isLoading, error } = useConnectionStatus();

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
        <StateView variant="loading" heading="Загрузка" />
      ) : error ? (
        <StateView
          variant="error"
          icon={<AlertCircle size={48} color="var(--error)" aria-hidden="true" />}
          heading="Не удалось загрузить статус"
          description={`${error instanceof Error ? error.message : 'Ошибка подключения'} Проверьте, что приложение запущено и конфигурация задана.`}
        />
      ) : config ? (
        <StatusCard config={config} connectionStatus={connectionStatus} />
      ) : null}
    </main>
  );
}

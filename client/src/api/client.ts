import type { ConfigResponse } from '../../../shared/types/api';
import type { ConnectionStatus } from '../../../shared/types/jira';

/**
 * HTTP client for backend /api/* (CONTEXT.md D-40).
 * The browser never sees the PAT — it only calls same-origin /api endpoints.
 */
export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch('/api/config');
  if (!res.ok) {
    throw new Error(`Не удалось получить конфигурацию (${res.status})`);
  }
  return res.json() as Promise<ConfigResponse>;
}

export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const res = await fetch('/api/connection-status');
  if (!res.ok) {
    throw new Error(`Не удалось проверить подключение (${res.status})`);
  }
  return res.json() as Promise<ConnectionStatus>;
}

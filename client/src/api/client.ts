import type { ConfigResponse } from '../../../shared/types/api';

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

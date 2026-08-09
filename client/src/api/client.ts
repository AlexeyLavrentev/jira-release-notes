import type { ConfigResponse } from '../../../shared/types/api';
import type { ConnectionStatus } from '../../../shared/types/jira';
import type { SearchBody } from '../../../shared/schemas/search';
import type { SearchResponse, Project, Version } from '../../../shared/types/issue';

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

export async function searchIssues(body: SearchBody): Promise<SearchResponse> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Ошибка поиска (${res.status})`);
  }
  return res.json() as Promise<SearchResponse>;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) {
    throw new Error(`Не удалось получить проекты (${res.status})`);
  }
  return res.json() as Promise<Project[]>;
}

export async function fetchVersions(projectKey: string): Promise<Version[]> {
  const res = await fetch(`/api/versions?project=${encodeURIComponent(projectKey)}`);
  if (!res.ok) {
    throw new Error(`Не удалось получить версии (${res.status})`);
  }
  return res.json() as Promise<Version[]>;
}

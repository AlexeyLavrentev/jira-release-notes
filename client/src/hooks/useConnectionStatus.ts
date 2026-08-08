import { useQuery } from '@tanstack/react-query';
import { fetchConfig, fetchConnectionStatus } from '../api/client.js';

/**
 * TanStack Query hooks (CONTEXT.md D-41): fetches GET /api/config + /api/connection-status.
 */
export function useConnectionStatus() {
  const configQuery = useQuery({ queryKey: ['config'], queryFn: fetchConfig });
  const connectionQuery = useQuery({
    queryKey: ['connection-status'],
    queryFn: fetchConnectionStatus,
  });

  return {
    config: configQuery.data,
    connectionStatus: connectionQuery.data,
    isLoading: configQuery.isLoading || connectionQuery.isLoading,
    error: configQuery.error ?? connectionQuery.error,
  };
}

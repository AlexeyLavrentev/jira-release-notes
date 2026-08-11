import { createContext, useContext, useMemo } from 'react';
import {
  createValidation,
  DEFAULT_THRESHOLD,
  type ValidationApi,
} from '../lib/validation.js';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';

/**
 * ValidationContext (Phase 10 D-08) — a SINGLE createValidation factory instance shared app-wide
 * via context, mirroring the EditsContext pattern (the repo's only other Context+Provider+hook).
 *
 * Without this, every consumer (IssueTable, EditPage, ExportPage) would construct its own factory
 * and the configured threshold (Phase 10 CONF-01) would have to be prop-drilled to each. Instead
 * the provider reads the threshold from /api/config (via useConnectionStatus) once and exposes the
 * bound ValidationApi to all consumers via useValidation().
 */
const ValidationContext = createContext<ValidationApi | null>(null);

export function ValidationProvider({ children }: { children: React.ReactNode }) {
  // D-14 — config arrives asynchronously via TanStack Query. DEFAULT_THRESHOLD (15) covers the
  // first render before /api/config resolves; useMemo swaps the factory when shortThreshold lands.
  // There is intentionally NO loading state — the first-render gap is covered synchronously by the
  // default, and a threshold flip takes effect on the next render (no mid-session partial apply).
  const { config } = useConnectionStatus();
  const threshold = config?.shortThreshold ?? DEFAULT_THRESHOLD;
  const api = useMemo(() => createValidation(threshold), [threshold]);
  return (
    <ValidationContext.Provider value={api}>{children}</ValidationContext.Provider>
  );
}

export function useValidation(): ValidationApi {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error('useValidation must be used within ValidationProvider');
  }
  return ctx;
}

export type { ValidationApi };

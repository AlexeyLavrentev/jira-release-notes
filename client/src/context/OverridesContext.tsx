import { createContext, useContext, useEffect } from 'react';
import { useSessionOverrides, type OverridesApi } from '../hooks/useSessionOverrides.js';

/**
 * OverridesContext (Phase 14, locked storage decision): a SINGLE useSessionOverrides
 * instance shared app-wide via context — structural mirror of EditsContext. Without
 * this every consumer (SelectPage rows, Phase 14 plan 02 ExportPage) would get its
 * own useState and override choices would diverge.
 */
const OverridesContext = createContext<OverridesApi | null>(null);

export function OverridesProvider({ children }: { children: React.ReactNode }) {
  const overridesApi = useSessionOverrides();

  // Conditional beforeunload listener (D-16/EDIT-04 mirror): added ONLY when the overrides
  // map is non-empty, removed (via cleanup) when it empties again. Lives at the provider
  // level so it's active app-wide whenever overrides exist — not just on /select.
  useEffect(() => {
    if (!overridesApi.hasOverrides) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue set (truthy)
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [overridesApi.hasOverrides]);

  return <OverridesContext.Provider value={overridesApi}>{children}</OverridesContext.Provider>;
}

export function useOverrides(): OverridesApi {
  const ctx = useContext(OverridesContext);
  if (!ctx) {
    throw new Error('useOverrides must be used within OverridesProvider');
  }
  return ctx;
}

export type { OverridesApi };
